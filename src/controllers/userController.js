import mongoose from 'mongoose';
import Branch from '../models/Branch.js';
import Person from '../models/Person.js';
import User from '../models/User.js';

// @desc    Obtener todos los usuarios
// @route   GET /api/users
export const getUsers = async (req, res, next) => {
  try {
    const users = await User.find({ activo: true })
      .populate({ path: 'person', populate: { path: 'branches', select: 'name' } })
      .populate('roles')
      .populate('branch', 'name');
    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtener un usuario por ID
// @route   GET /api/users/:id
export const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .populate({ path: 'person', populate: { path: 'branches', select: 'name' } })
      .populate('roles')
      .populate('branch', 'name');
    
    if (!user) {
      const error = new Error('Usuario no encontrado');
      error.statusCode = 404;
      return next(error);
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Crear nuevo usuario
// @route   POST /api/users
export const createUser = async (req, res, next) => {
  try {
    if (!req.body.branch) {
      const error = new Error('Debe especificar la sucursal del usuario');
      error.statusCode = 400;
      return next(error);
    }

    if (req.body.branch && !mongoose.Types.ObjectId.isValid(req.body.branch)) {
      const error = new Error('El identificador de la sucursal es inválido');
      error.statusCode = 400;
      return next(error);
    }

    const branchExists = await Branch.exists({ _id: req.body.branch });

    if (!branchExists) {
      const error = new Error('La sucursal indicada no existe');
      error.statusCode = 404;
      return next(error);
    }

    const user = await User.create(req.body);

    await user.populate({ path: 'person', populate: { path: 'branches', select: 'name' } });
    await user.populate('roles');
    await user.populate('branch', 'name');
    res.status(201).json({
      success: true,
      data: user
    });
  } catch (error) {
    if (error.code === 11000) {
      error.message = 'El email ya está registrado';
      error.statusCode = 400;
    }
    next(error);
  }
};

// @desc    Crear usuario a partir de una persona existente
// @route   POST /api/users/from-person
export const createUserFromPerson = async (req, res, next) => {
  try {
    const {
      personId,
      username,
      email,
      password,
      roles
    } = req.body;

    if (!personId || !username || !email || !password || !Array.isArray(roles) || roles.length === 0) {
      const error = new Error('personId, username, email, password y roles son requeridos');
      error.statusCode = 400;
      return next(error);
    }

    if (!mongoose.Types.ObjectId.isValid(personId)) {
      const error = new Error('El identificador de la persona es inválido');
      error.statusCode = 400;
      return next(error);
    }

    const person = await Person.findById(personId).populate('branches', 'name');

    if (!person || !person.activo) {
      const error = new Error('La persona indicada no existe o está inactiva');
      error.statusCode = 404;
      return next(error);
    }

    const existingUserForPerson = await User.exists({ person: personId });

    if (existingUserForPerson) {
      const error = new Error('La persona indicada ya tiene un usuario asignado');
      error.statusCode = 400;
      return next(error);
    }

    const existingUser = await User.findOne({
      $or: [{ username }, { email }]
    }).select('_id');

    if (existingUser) {
      const error = new Error('Username o email ya existe');
      error.statusCode = 400;
      return next(error);
    }

    const personBranchIds = (person.branches || []).map((branchId) => branchId.toString());

    if (!personBranchIds.length) {
      const error = new Error('La persona no tiene sucursales asignadas');
      error.statusCode = 400;
      return next(error);
    }

    const requestedBranchId = req.body.branchId || req.body.branch || personBranchIds[0];

    if (!mongoose.Types.ObjectId.isValid(requestedBranchId)) {
      const error = new Error('El identificador de la sucursal es inválido');
      error.statusCode = 400;
      return next(error);
    }

    const normalizedBranchId = requestedBranchId.toString();

    if (!personBranchIds.includes(normalizedBranchId)) {
      const error = new Error('La sucursal indicada no está asignada a la persona');
      error.statusCode = 400;
      return next(error);
    }

    const branchExists = await Branch.exists({ _id: normalizedBranchId });

    if (!branchExists) {
      const error = new Error('La sucursal asociada a la persona no existe');
      error.statusCode = 404;
      return next(error);
    }

    const user = await User.create({
      username,
      email,
      password,
      person: personId,
      roles,
      branch: normalizedBranchId
    });

    await user.populate({ path: 'person', populate: { path: 'branches', select: 'name' } });
    await user.populate('roles');
    await user.populate('branch', 'name');

    res.status(201).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Actualizar usuario
// @route   PUT /api/users/:id
export const updateUser = async (req, res, next) => {
  try {
    if (Object.prototype.hasOwnProperty.call(req.body, 'branch')) {
      if (!req.body.branch) {
        const error = new Error('La sucursal no puede ser vacía');
        error.statusCode = 400;
        return next(error);
      }

      if (!mongoose.Types.ObjectId.isValid(req.body.branch)) {
        const error = new Error('El identificador de la sucursal es inválido');
        error.statusCode = 400;
        return next(error);
      }

      const branchExists = await Branch.exists({ _id: req.body.branch });

      if (!branchExists) {
        const error = new Error('La sucursal indicada no existe');
        error.statusCode = 404;
        return next(error);
      }
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate({ path: 'person', populate: { path: 'branches', select: 'name' } })
      .populate('roles')
      .populate('branch', 'name');

    if (!user) {
      const error = new Error('Usuario no encontrado');
      error.statusCode = 404;
      return next(error);
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Eliminar usuario (soft delete)
// @route   DELETE /api/users/:id
export const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { activo: false },
      { new: true }
    );

    if (!user) {
      const error = new Error('Usuario no encontrado');
      error.statusCode = 404;
      return next(error);
    }

    res.status(200).json({
      success: true,
      message: 'Usuario eliminado correctamente'
    });
  } catch (error) {
    next(error);
  }
};
