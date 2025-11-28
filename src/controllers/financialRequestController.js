import mongoose from 'mongoose';
import FinancialRequest, { DEPOSIT_TYPES, FINANCIAL_REQUEST_STATUS } from '../models/FinancialRequest.js';
import GlobalConfig, { CURRENCIES } from '../models/GlobalConfig.js';
import Branch from '../models/Branch.js';
import User from '../models/User.js';
import Account from '../models/Account.js';

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
  NETWORK_PASTOR: 'PASTOR',
  LEAD_PASTOR: 'PASTOR PRINCIPAL',
  ADMIN: 'ADMINISTRADOR',
  TREASURER: 'TESORERO'
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
      if (!isSameObjectId(request.branch, user.branch)) {
        throw buildError('Solo puede aprobar solicitudes de su sucursal', 403);
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
        if (!hasAdmin && !isSameObjectId(request.branch, user.branch)) {
          throw buildError('Solo puede rechazar solicitudes de su sucursal', 403);
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
    const canCreate = hasRole(req.user, ROLE_NAMES.ADMIN, ROLE_NAMES.LEAD_PASTOR, ROLE_NAMES.NETWORK_PASTOR, ROLE_NAMES.TREASURER);

    if (!canCreate) {
      throw buildError('No tiene permisos para crear solicitudes financieras', 403);
    }

    let {
      branchId,
      requesterUserId,
      description,
      currency,
      costCenterId,
      items,
      depositType,
      ownAccountId,
      bankName,
      accountNumber,
      accountNumberCCI,
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

    if (!mongoose.Types.ObjectId.isValid(requesterId)) {
      throw buildError('El identificador del solicitante es inválido');
    }

    const requesterUserDoc = await User.findById(requesterId).select('person');

    if (!requesterUserDoc) {
      throw buildError('El solicitante indicado no existe', 404);
    }

    if (normalizedDepositType === DEPOSIT_TYPES.OWN_ACCOUNT && !requesterUserDoc.person) {
      throw buildError('El solicitante no tiene una persona asociada para vincular una cuenta propia');
    }

    const requiresLeadApproval = totalAmount > config.maxAmountLeadApproval;

    let normalizedOwnAccountId = null;

    if (ownAccountId) {
      if (!mongoose.Types.ObjectId.isValid(ownAccountId)) {
        throw buildError('El identificador de la cuenta propia es inválido');
      }

      const account = await Account.findById(ownAccountId).select('person active');

      if (!account || !account.active) {
        throw buildError('La cuenta propia indicada no existe o está inactiva', 404);
      }

      if (
        requesterUserDoc.person &&
        account.person &&
        !isSameObjectId(account.person, requesterUserDoc.person)
      ) {
        throw buildError('La cuenta propia indicada no pertenece a la persona del solicitante');
      }

      normalizedOwnAccountId = account._id;
    }

    if (normalizedDepositType === DEPOSIT_TYPES.OWN_ACCOUNT && !normalizedOwnAccountId) {
      throw buildError('Debe proporcionar una cuenta propia válida para este tipo de abono');
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

    // Obtener el supervisor del branch del solicitante (del token)
    const requesterBranch = await Branch.findById(req.user.branch).select('managerUser');

    const supervisorUserToAssign = requesterBranch?.managerUser || null;

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
      accountNumberCCI: accountNumberCCI || null,
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

    await financialRequest.populate({
      path: 'ownAccountId',
      select: 'alias bankName accountNumber accountNumberCCI docType docNumber person',
      populate: { path: 'person', select: 'nombres apellidos numeroDocumento' }
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

    // Filtrar por permisos de rol
    const canSeeAll = hasRole(req.user, ROLE_NAMES.ADMIN, ROLE_NAMES.LEAD_PASTOR);

    if (!canSeeAll) {
      filter.branch = req.user.branch;
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
      .populate('requesterUser', 'username email')
      .populate({
        path: 'ownAccountId',
        select: 'alias bankName accountNumber accountNumberCCI docType docNumber person',
        populate: { path: 'person', select: 'nombres apellidos numeroDocumento' }
      });

    // Asignar supervisor de la rama si no tiene supervisorUser
    requests.forEach(request => {
      if (!request.supervisorUser) {
        request.supervisorUser = request.branch?.managerUser || null;
      }
    });

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
      .populate('requesterUser', 'username email')
      .populate({
        path: 'ownAccountId',
        select: 'alias bankName accountNumber accountNumberCCI docType docNumber person',
        populate: { path: 'person', select: 'nombres apellidos numeroDocumento' }
      });

    if (!request) {
      throw buildError('Solicitud no encontrada', 404);
    }

    // Asignar supervisor de la rama si no tiene supervisorUser
    if (!request.supervisorUser) {
      request.supervisorUser = request.branch?.managerUser || null;
    }

    // Crear state stepper con estados relevantes
    const completedStatuses = new Set(request.statusHistory.map(h => h.status));
    const relevantStatuses = [FINANCIAL_REQUEST_STATUS.CREATED, FINANCIAL_REQUEST_STATUS.APPROVED_NETWORK];

    if (request.requiresLeadApproval) {
      relevantStatuses.push(FINANCIAL_REQUEST_STATUS.APPROVED_LEAD);
    }

    relevantStatuses.push(
      FINANCIAL_REQUEST_STATUS.APPROVED_ADMIN,
      FINANCIAL_REQUEST_STATUS.MONEY_DELIVERED,
      FINANCIAL_REQUEST_STATUS.EXPENSES_SUBMITTED
    );

    if (request.remainderAmount > 0) {
      relevantStatuses.push(FINANCIAL_REQUEST_STATUS.REMAINDER_REFUNDED);
    }

    relevantStatuses.push(FINANCIAL_REQUEST_STATUS.CLOSED);

    if (completedStatuses.has(FINANCIAL_REQUEST_STATUS.REJECTED)) {
      relevantStatuses.push(FINANCIAL_REQUEST_STATUS.REJECTED);
    }

    const stateStepper = relevantStatuses.map(status => ({
      status,
      completed: completedStatuses.has(status)
    }));

    res.status(200).json({
      success: true,
      data: {
        ...request.toObject(),
        stateStepper
      }
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

    const requesterUserDoc = await User.findById(request.requesterUser).select('person');

    const directFields = [
      'description',
      'currency',
      'depositType',
      'bankName',
      'accountNumber',
      'accountNumberCCI',
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

      if (normalizedDepositType !== DEPOSIT_TYPES.OWN_ACCOUNT) {
        request.ownAccountId = null;
      }
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
        if (!mongoose.Types.ObjectId.isValid(rawOwnAccountId)) {
          throw buildError('El identificador de la cuenta propia es inválido');
        }

        const account = await Account.findById(rawOwnAccountId).select('person active');

        if (!account || !account.active) {
          throw buildError('La cuenta propia indicada no existe o está inactiva', 404);
        }

        if (
          requesterUserDoc?.person &&
          account.person &&
          !isSameObjectId(account.person, requesterUserDoc.person)
        ) {
          throw buildError('La cuenta propia indicada no pertenece a la persona del solicitante');
        }

        request.ownAccountId = account._id;
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

    if (request.depositType === DEPOSIT_TYPES.OWN_ACCOUNT && !requesterUserDoc?.person) {
      throw buildError('El solicitante no tiene una persona asociada para vincular una cuenta propia');
    }

    if (request.depositType === DEPOSIT_TYPES.OWN_ACCOUNT && !request.ownAccountId) {
      throw buildError('Debe proporcionar una cuenta propia válida para este tipo de abono');
    }

    await request.save();

    await request.populate({
      path: 'ownAccountId',
      select: 'alias bankName accountNumber accountNumberCCI docType docNumber person',
      populate: { path: 'person', select: 'nombres apellidos numeroDocumento' }
    });

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

    await request.populate({
      path: 'ownAccountId',
      select: 'alias bankName accountNumber accountNumberCCI docType docNumber person',
      populate: { path: 'person', select: 'nombres apellidos numeroDocumento' }
    });

    res.status(200).json({
      success: true,
      data: request
    });
  } catch (error) {
    next(error);
  }
};
