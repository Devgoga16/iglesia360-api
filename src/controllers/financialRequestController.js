import mongoose from 'mongoose';
import FinancialRequest, { DEPOSIT_TYPES, FINANCIAL_REQUEST_STATUS } from '../models/FinancialRequest.js';
import GlobalConfig, { CURRENCIES } from '../models/GlobalConfig.js';
import Branch from '../models/Branch.js';
import User from '../models/User.js';

const evidenceRequiredStatuses = new Set([
  FINANCIAL_REQUEST_STATUS.MONEY_DELIVERED,
  FINANCIAL_REQUEST_STATUS.EXPENSES_SUBMITTED,
  FINANCIAL_REQUEST_STATUS.REMAINDER_REFUNDED
]);

const buildError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const calculateTotal = (items) => {
  if (!Array.isArray(items)) {
    return 0;
  }

  return items.reduce((acc, item) => {
    const parsed = Number(item?.amount);
    return acc + (Number.isNaN(parsed) ? 0 : parsed);
  }, 0);
};

const ROLE_NAMES = {
  REQUESTER: 'REQUESTER',
  NETWORK_PASTOR: 'NETWORK_PASTOR',
  LEAD_PASTOR: 'LEAD_PASTOR',
  ADMIN: 'ADMIN'
};

const toObjectIdString = (value) => {
  if (!value) {
    return null;
  }

  return typeof value === 'string' ? value : value.toString();
};

const isSameObjectId = (left, right) => {
  const leftId = toObjectIdString(left);
  const rightId = toObjectIdString(right);

  if (!leftId || !rightId) {
    return false;
  }

  return leftId === rightId;
};

const getUserRoleNames = (user) => {
  if (!user?.roles) {
    return [];
  }

  return user.roles.map((role) => (role?.nombre || '').toUpperCase());
};

const hasRole = (user, ...roles) => {
  const userRoles = getUserRoleNames(user);
  return roles.some((role) => userRoles.includes(role.toUpperCase()));
};

const ensureStatusPermission = (request, nextStatus, user) => {
  const isRequester = isSameObjectId(request.requesterUser, user?._id);
  const hasNetwork = hasRole(user, ROLE_NAMES.NETWORK_PASTOR, ROLE_NAMES.ADMIN);
  const hasLead = hasRole(user, ROLE_NAMES.LEAD_PASTOR, ROLE_NAMES.ADMIN);
  const hasAdmin = hasRole(user, ROLE_NAMES.ADMIN);

  switch (nextStatus) {
    case FINANCIAL_REQUEST_STATUS.APPROVED_NETWORK:
      if (!hasNetwork) {
        throw buildError('No tiene permisos para aprobar a nivel de Red', 403);
      }
      break;
    case FINANCIAL_REQUEST_STATUS.APPROVED_LEAD:
      if (!hasLead) {
        throw buildError('No tiene permisos para aprobación del pastor titular', 403);
      }
      break;
    case FINANCIAL_REQUEST_STATUS.APPROVED_ADMIN:
    case FINANCIAL_REQUEST_STATUS.MONEY_DELIVERED:
    case FINANCIAL_REQUEST_STATUS.CLOSED:
      if (!hasAdmin) {
        throw buildError('Solo un administrador puede continuar con esta acción', 403);
      }
      break;
    case FINANCIAL_REQUEST_STATUS.EXPENSES_SUBMITTED:
      if (!isRequester) {
        throw buildError('Solo el solicitante puede cargar los comprobantes de gasto', 403);
      }
      break;
    case FINANCIAL_REQUEST_STATUS.REMAINDER_REFUNDED:
      if (!isRequester && !hasAdmin) {
        throw buildError('Solo el solicitante o un administrador pueden reportar remanentes', 403);
      }
      break;
    case FINANCIAL_REQUEST_STATUS.REJECTED: {
      const current = request.currentStatus;

      if (current === FINANCIAL_REQUEST_STATUS.CREATED) {
        if (!hasNetwork) {
          throw buildError('Solo un pastor de red o administrador puede rechazar en esta etapa', 403);
        }
      } else if (current === FINANCIAL_REQUEST_STATUS.APPROVED_NETWORK) {
        if (request.requiresLeadApproval) {
          if (!hasLead) {
            throw buildError('Solo el pastor titular o un administrador pueden rechazar en esta etapa', 403);
          }
        } else if (!hasAdmin) {
          throw buildError('Solo un administrador puede rechazar en esta etapa', 403);
        }
      } else if (
        current === FINANCIAL_REQUEST_STATUS.APPROVED_LEAD ||
        current === FINANCIAL_REQUEST_STATUS.APPROVED_ADMIN ||
        current === FINANCIAL_REQUEST_STATUS.MONEY_DELIVERED ||
        current === FINANCIAL_REQUEST_STATUS.EXPENSES_SUBMITTED ||
        current === FINANCIAL_REQUEST_STATUS.REMAINDER_REFUNDED
      ) {
        if (!hasAdmin) {
          throw buildError('Solo un administrador puede rechazar en esta etapa', 403);
        }
      } else {
        throw buildError('No es posible rechazar en esta etapa', 400);
      }

      break;
    }
    default:
      break;
  }
};


const ensureConfig = async () => {
  const config = await GlobalConfig.getConfig();
  return config;
};

// @desc    Crear solicitud financiera
// @route   POST /api/financial-requests
export const createFinancialRequest = async (req, res, next) => {
  try {
    let {
      branchId,
      supervisorUserId,
      requesterUserId,
      description,
      currency,
      costCenterId,
      items,
      depositType,
      ownAccountId,
      bankName,
      accountNumber,
      docType,
      docNumber
    } = req.body;

    if (!branchId && req.user?.branch) {
      branchId = req.user.branch._id ? req.user.branch._id.toString() : req.user.branch.toString();
    }

    if (!branchId || !description || !depositType || !Array.isArray(items) || items.length === 0) {
      throw buildError('Los campos branchId, description, depositType e items son requeridos');
    }

    if (!mongoose.Types.ObjectId.isValid(branchId)) {
      throw buildError('El identificador de la sucursal es inválido');
    }

    if (supervisorUserId && !mongoose.Types.ObjectId.isValid(supervisorUserId)) {
      throw buildError('El identificador del supervisor es inválido');
    }

    if (supervisorUserId) {
      const supervisorExists = await User.exists({ _id: supervisorUserId });

      if (!supervisorExists) {
        throw buildError('El supervisor indicado no existe', 404);
      }
    }

    const normalizedDepositType = String(depositType).toUpperCase();

    if (!Object.values(DEPOSIT_TYPES).includes(normalizedDepositType)) {
      throw buildError('El tipo de abono proporcionado es inválido');
    }

    const config = await ensureConfig();

    const normalizedItems = items.map((item) => ({
      description: item?.description,
      amount: Number(item?.amount)
    }));

    const hasInvalidItem = normalizedItems.some((item) => {
      if (!item.description || typeof item.description !== 'string') {
        return true;
      }

      return Number.isNaN(item.amount) || item.amount <= 0;
    });

    if (hasInvalidItem) {
      throw buildError('Cada item debe incluir descripción y un monto mayor a cero');
    }

    const totalAmount = calculateTotal(normalizedItems);

    if (totalAmount <= 0) {
      throw buildError('El monto total debe ser mayor a 0');
    }

    const requesterId = requesterUserId || req.user?._id;

    if (!requesterId) {
      throw buildError('Debe especificar el solicitante de la solicitud');
    }

    const requiresLeadApproval = totalAmount > config.maxAmountLeadApproval;

    const normalizedOwnAccountId = ownAccountId === null || ownAccountId === undefined
      ? null
      : Number(ownAccountId);

    if (normalizedOwnAccountId !== null && Number.isNaN(normalizedOwnAccountId)) {
      throw buildError('El identificador de la cuenta propia debe ser numérico');
    }

    const normalizedCurrency = currency
      ? String(currency).toUpperCase()
      : config.defaultCurrency;

    if (normalizedCurrency && !Object.values(CURRENCIES).includes(normalizedCurrency)) {
      throw buildError('La moneda proporcionada es inválida');
    }

    const branch = await Branch.findById(branchId)
      .populate('managerUser', 'username email')
      .populate('manager', 'nombres apellidos');

    if (!branch) {
      throw buildError('La sucursal indicada no existe', 404);
    }

    const supervisorUserToAssign = supervisorUserId || branch.managerUser?._id || null;

    const financialRequest = await FinancialRequest.create({
      branch: branchId,
      supervisorUser: supervisorUserToAssign,
      requesterUser: requesterId,
      description,
      currency: normalizedCurrency,
      costCenter: costCenterId || null,
      items: normalizedItems,
      depositType: normalizedDepositType,
      ownAccountId: normalizedOwnAccountId,
      bankName: bankName || null,
      accountNumber: accountNumber || null,
      docType: docType || null,
      docNumber: docNumber || null,
      requiresLeadApproval,
      totalAmount,
      statusHistory: [{
        status: FINANCIAL_REQUEST_STATUS.CREATED,
        changedBy: requesterId,
        approved: true,
        evidenceUrls: []
      }]
    });

    res.status(201).json({
      success: true,
      data: financialRequest
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Listar solicitudes financieras
// @route   GET /api/financial-requests
export const getFinancialRequests = async (req, res, next) => {
  try {
    const { status, branchId, requesterUserId } = req.query;
    const filter = {};

    if (status) {
      const normalizedStatus = String(status).toUpperCase();

      if (!Object.values(FINANCIAL_REQUEST_STATUS).includes(normalizedStatus)) {
        throw buildError('Estado de filtro inválido');
      }

      filter.currentStatus = normalizedStatus;
    }

    if (branchId && mongoose.Types.ObjectId.isValid(branchId)) {
      filter.branch = branchId;
    }

    if (requesterUserId && mongoose.Types.ObjectId.isValid(requesterUserId)) {
      filter.requesterUser = requesterUserId;
    }

    const requests = await FinancialRequest.find(filter)
      .sort({ createdAt: -1 })
      .populate({
        path: 'branch',
        select: 'name depth parentBranch manager managerUser',
        populate: [
          { path: 'parentBranch', select: 'name' },
          { path: 'manager', select: 'nombres apellidos numeroDocumento' },
          { path: 'managerUser', select: 'username email' }
        ]
      })
      .populate('supervisorUser', 'username email')
      .populate('requesterUser', 'username email');

    res.status(200).json({
      success: true,
      count: requests.length,
      data: requests
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtener solicitud financiera
// @route   GET /api/financial-requests/:id
export const getFinancialRequestById = async (req, res, next) => {
  try {
    const request = await FinancialRequest.findById(req.params.id)
      .populate({
        path: 'branch',
        select: 'name address depth parentBranch manager managerUser',
        populate: [
          { path: 'parentBranch', select: 'name' },
          { path: 'manager', select: 'nombres apellidos numeroDocumento' },
          { path: 'managerUser', select: 'username email' }
        ]
      })
      .populate('supervisorUser', 'username email')
      .populate('requesterUser', 'username email');

    if (!request) {
      throw buildError('Solicitud no encontrada', 404);
    }

    res.status(200).json({
      success: true,
      data: request
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Actualizar datos generales de la solicitud (solo en estado creado)
// @route   PUT /api/financial-requests/:id
export const updateFinancialRequest = async (req, res, next) => {
  try {
    const request = await FinancialRequest.findById(req.params.id);

    if (!request) {
      throw buildError('Solicitud no encontrada', 404);
    }

    if (request.currentStatus !== FINANCIAL_REQUEST_STATUS.CREATED) {
      throw buildError('Solo se pueden editar solicitudes en estado CREATED');
    }

    const isRequester = isSameObjectId(request.requesterUser, req.user?._id);
    const isAdmin = hasRole(req.user, ROLE_NAMES.ADMIN);

    if (!isRequester && !isAdmin) {
      throw buildError('Solo el solicitante o un administrador pueden editar la solicitud', 403);
    }

    const directFields = [
      'description',
      'currency',
      'depositType',
      'ownAccountId',
      'bankName',
      'accountNumber',
      'docType',
      'docNumber'
    ];

    directFields.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        request[field] = req.body[field];
      }
    });

    if (Object.prototype.hasOwnProperty.call(req.body, 'depositType')) {
      const normalizedDepositType = String(req.body.depositType).toUpperCase();

      if (!Object.values(DEPOSIT_TYPES).includes(normalizedDepositType)) {
        throw buildError('El tipo de abono proporcionado es inválido');
      }

      request.depositType = normalizedDepositType;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'currency')) {
      const normalizedCurrency = String(req.body.currency).toUpperCase();

      if (!Object.values(CURRENCIES).includes(normalizedCurrency)) {
        throw buildError('La moneda proporcionada es inválida');
      }

      request.currency = normalizedCurrency;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'ownAccountId')) {
      const rawOwnAccountId = req.body.ownAccountId;

      if (rawOwnAccountId === null || rawOwnAccountId === undefined || rawOwnAccountId === '') {
        request.ownAccountId = null;
      } else {
        const numericId = Number(rawOwnAccountId);

        if (Number.isNaN(numericId)) {
          throw buildError('El identificador de la cuenta propia debe ser numérico');
        }

        request.ownAccountId = numericId;
      }
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'items')) {
      const items = req.body.items;

      if (!Array.isArray(items) || !items.length) {
        throw buildError('Debe proporcionar al menos un item');
      }

      const normalizedItems = items.map((item) => ({
        description: item?.description,
        amount: Number(item?.amount)
      }));

      const hasInvalidItem = normalizedItems.some((item) => {
        if (!item.description || typeof item.description !== 'string') {
          return true;
        }

        return Number.isNaN(item.amount) || item.amount <= 0;
      });

      if (hasInvalidItem) {
        throw buildError('Cada item debe incluir descripción y un monto mayor a cero');
      }

      request.items = normalizedItems;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'costCenterId')) {
      request.costCenter = req.body.costCenterId;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'supervisorUserId')) {
      const supervisorUserId = req.body.supervisorUserId;

      if (supervisorUserId && !mongoose.Types.ObjectId.isValid(supervisorUserId)) {
        throw buildError('El identificador del supervisor es inválido');
      }

      if (supervisorUserId) {
        const supervisorExists = await User.exists({ _id: supervisorUserId });

        if (!supervisorExists) {
          throw buildError('El supervisor indicado no existe', 404);
        }
      }

      request.supervisorUser = supervisorUserId || null;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'branchId')) {
      const newBranchId = req.body.branchId;

      if (!mongoose.Types.ObjectId.isValid(newBranchId)) {
        throw buildError('El identificador de la sucursal es inválido');
      }

      const newBranch = await Branch.findById(newBranchId).select('managerUser');

      if (!newBranch) {
        throw buildError('La sucursal indicada no existe', 404);
      }

      request.branch = newBranchId;

      if (!Object.prototype.hasOwnProperty.call(req.body, 'supervisorUserId') && newBranch.managerUser) {
        request.supervisorUser = newBranch.managerUser;
      }
    }

    const config = await ensureConfig();
    const recalculatedTotal = calculateTotal(request.items);
    request.totalAmount = recalculatedTotal;
    request.requiresLeadApproval = recalculatedTotal > config.maxAmountLeadApproval;

    await request.save();

    res.status(200).json({
      success: true,
      data: request
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cambiar estado de solicitud financiera
// @route   PATCH /api/financial-requests/:id/status
export const changeFinancialRequestStatus = async (req, res, next) => {
  try {
    const {
      status,
      evidenceUrls = [],
      rejectionReason,
      metadata = null,
      remainderAmount
    } = req.body;

    if (!status) {
      throw buildError('Debe especificar el nuevo estado');
    }

    if (!Object.values(FINANCIAL_REQUEST_STATUS).includes(status)) {
      throw buildError('Estado inválido');
    }

    const request = await FinancialRequest.findById(req.params.id);

    if (!request) {
      throw buildError('Solicitud no encontrada', 404);
    }

    if (
      request.currentStatus === FINANCIAL_REQUEST_STATUS.CLOSED ||
      request.currentStatus === FINANCIAL_REQUEST_STATUS.REJECTED
    ) {
      throw buildError('La solicitud ya se encuentra cerrada o rechazada');
    }

    if (!request.canTransitionTo(status)) {
      throw buildError('Transición de estado no permitida');
    }

    ensureStatusPermission(request, status, req.user);

    if (status === FINANCIAL_REQUEST_STATUS.REJECTED && !rejectionReason) {
      throw buildError('Debe proporcionar un motivo de rechazo');
    }

    const sanitizedEvidence = Array.isArray(evidenceUrls)
      ? evidenceUrls
        .filter((url) => typeof url === 'string')
        .map((url) => url.trim())
        .filter((url) => url.length > 0)
      : [];

    if (evidenceRequiredStatuses.has(status) && sanitizedEvidence.length === 0) {
      throw buildError('Debe adjuntar evidencia para este estado');
    }

    const changedByUserId = req.user?._id;

    const historyEntry = {
      status,
      changedBy: changedByUserId,
      approved: status !== FINANCIAL_REQUEST_STATUS.REJECTED,
      evidenceUrls: sanitizedEvidence,
      rejectionReason: status === FINANCIAL_REQUEST_STATUS.REJECTED
        ? rejectionReason
        : undefined
    };

    if (metadata && typeof metadata === 'object') {
      historyEntry.metadata = metadata;
    }

    if (status === FINANCIAL_REQUEST_STATUS.REMAINDER_REFUNDED) {
      const normalizedRemainder = Number(remainderAmount);

      if (Number.isNaN(normalizedRemainder) || normalizedRemainder < 0) {
        throw buildError('Debe especificar un monto válido para el remanente devuelto');
      }

      request.remainderAmount = normalizedRemainder;

      if (!historyEntry.metadata) {
        historyEntry.metadata = {};
      }

      historyEntry.metadata.remainderAmount = normalizedRemainder;
    }

    request.currentStatus = status;
    request.statusHistory.push(historyEntry);

    await request.save();

    res.status(200).json({
      success: true,
      data: request
    });
  } catch (error) {
    next(error);
  }
};
