import mongoose from 'mongoose';
import Account from '../models/Account.js';
import Person from '../models/Person.js';

const populateAccount = (query) => query.populate({
  path: 'person',
  select: 'nombres apellidos numeroDocumento activo branch',
  populate: { path: 'branch', select: 'name' }
});

const sanitizeString = (value) => {
  if (typeof value !== 'string') {
    return value;
  }
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
};

const sanitizeRequiredString = (fieldName, value) => {
  const sanitized = sanitizeString(value);

  if (!sanitized) {
    const error = new Error(`${fieldName} es requerido`);
    error.statusCode = 400;
    throw error;
  }

  return sanitized;
};

const ensureValidPerson = async (personId) => {
  if (!personId) {
    const error = new Error('Debe especificar la persona titular de la cuenta');
    error.statusCode = 400;
    throw error;
  }

  if (!mongoose.Types.ObjectId.isValid(personId)) {
    const error = new Error('El identificador de la persona es inválido');
    error.statusCode = 400;
    throw error;
  }

  const person = await Person.findById(personId).select('activo');

  if (!person || !person.activo) {
    const error = new Error('La persona indicada no existe o está inactiva');
    error.statusCode = 404;
    throw error;
  }

  return person;
};

// @desc    Obtener todas las cuentas bancarias
// @route   GET /api/accounts
export const getAccounts = async (req, res, next) => {
  try {
    const { active } = req.query;
    const filter = {};

    // Filtrar por la persona del usuario autenticado
    if (!req.user.person) {
      const error = new Error('El usuario no tiene una persona asociada');
      error.statusCode = 400;
      throw error;
    }

    filter.person = req.user.person._id;

    if (active === 'true') {
      filter.active = true;
    }

    if (active === 'false') {
      filter.active = false;
    }

    const accounts = await populateAccount(
      Account.find(filter).sort({ createdAt: -1 })
    );

    res.status(200).json({
      success: true,
      count: accounts.length,
      data: accounts
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtener cuenta bancaria por ID
// @route   GET /api/accounts/:id
export const getAccountById = async (req, res, next) => {
  try {
    const account = await populateAccount(Account.findById(req.params.id));

    if (!account) {
      const error = new Error('Cuenta no encontrada');
      error.statusCode = 404;
      return next(error);
    }

    // Verificar que la cuenta pertenece al usuario autenticado o es admin
    const isAdmin = req.user.roles.some(role => role.nombre === 'Administrador');
    if (!isAdmin && account.person._id.toString() !== req.user.person._id.toString()) {
      const error = new Error('No tienes permisos para acceder a esta cuenta');
      error.statusCode = 403;
      return next(error);
    }

    res.status(200).json({
      success: true,
      data: account
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Crear una nueva cuenta bancaria
// @route   POST /api/accounts
export const createAccount = async (req, res, next) => {
  try {
    const {
      person,
      alias,
      bankName,
      accountNumber,
      accountNumberCCI,
      docType,
      docNumber,
      active
    } = req.body;

    // Si no es admin, forzar que sea para su propia persona
    const isAdmin = req.user.roles.some(role => role.nombre === 'Administrador');
    const personId = isAdmin ? person : req.user.person._id;

    await ensureValidPerson(personId);

    if (!bankName || !accountNumber) {
      const error = new Error('bankName y accountNumber son requeridos');
      error.statusCode = 400;
      throw error;
    }

    const normalizedBankName = sanitizeRequiredString('bankName', bankName);
    const normalizedAccountNumber = sanitizeRequiredString('accountNumber', accountNumber);

    const account = await Account.create({
      person: personId,
      alias: sanitizeString(alias),
      bankName: normalizedBankName,
      accountNumber: normalizedAccountNumber,
      accountNumberCCI: sanitizeString(accountNumberCCI),
      docType: sanitizeString(docType),
      docNumber: sanitizeString(docNumber),
      active: typeof active === 'boolean' ? active : undefined
    });

    await populateAccount(account);

    res.status(201).json({
      success: true,
      data: account
    });
  } catch (error) {
    if (error.code === 11000) {
      error.statusCode = 400;
      error.message = 'La persona ya tiene registrada esta cuenta bancaria';
    }
    next(error);
  }
};

// @desc    Actualizar una cuenta bancaria
// @route   PUT /api/accounts/:id
export const updateAccount = async (req, res, next) => {
  try {
    const account = await Account.findById(req.params.id);

    if (!account) {
      const error = new Error('Cuenta no encontrada');
      error.statusCode = 404;
      return next(error);
    }

    // Verificar que la cuenta pertenece al usuario autenticado o es admin/pastor
    const isAdminOrPastor = req.user.roles.some(role => ['Administrador', 'Pastor'].includes(role.nombre));
    if (!isAdminOrPastor && account.person.toString() !== req.user.person._id.toString()) {
      const error = new Error('No tienes permisos para actualizar esta cuenta');
      error.statusCode = 403;
      return next(error);
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'person')) {
      await ensureValidPerson(req.body.person);
      account.person = req.body.person;
    }

    const simpleFields = ['alias', 'bankName', 'accountNumber', 'accountNumberCCI', 'docType', 'docNumber'];

    simpleFields.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        if (['bankName', 'accountNumber'].includes(field)) {
          account[field] = sanitizeRequiredString(field, req.body[field]);
        } else {
          const value = sanitizeString(req.body[field]);
          account[field] = value !== undefined ? value : undefined;
        }
      }
    });

    if (Object.prototype.hasOwnProperty.call(req.body, 'active')) {
      if (typeof req.body.active !== 'boolean') {
        const error = new Error('El estado activo debe ser booleano');
        error.statusCode = 400;
        return next(error);
      }
      account.active = req.body.active;
    }

    await account.save();
    await populateAccount(account);

    res.status(200).json({
      success: true,
      data: account
    });
  } catch (error) {
    if (error.code === 11000) {
      error.statusCode = 400;
      error.message = 'La persona ya tiene registrada esta cuenta bancaria';
    }
    next(error);
  }
};

// @desc    Eliminar (desactivar) una cuenta bancaria
// @route   DELETE /api/accounts/:id
export const deleteAccount = async (req, res, next) => {
  try {
    const account = await Account.findById(req.params.id);

    if (!account) {
      const error = new Error('Cuenta no encontrada');
      error.statusCode = 404;
      return next(error);
    }

    // Verificar que la cuenta pertenece al usuario autenticado o es admin
    const isAdmin = req.user.roles.some(role => role.nombre === 'Administrador');
    if (!isAdmin && account.person.toString() !== req.user.person._id.toString()) {
      const error = new Error('No tienes permisos para eliminar esta cuenta');
      error.statusCode = 403;
      return next(error);
    }

    await Account.findByIdAndUpdate(
      req.params.id,
      { active: false },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Cuenta desactivada correctamente'
    });
  } catch (error) {
    next(error);
  }
};
