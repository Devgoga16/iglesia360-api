import User from '../models/User.js';

// @desc    Obtener todos los usuarios
// @route   GET /api/users
export const getUsers = async (req, res, next) => {
  try {
    const users = await User.find({ activo: true });
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
    const user = await User.findById(req.params.id);
    
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
    const user = await User.create(req.body);
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

// @desc    Actualizar usuario
// @route   PUT /api/users/:id
export const updateUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

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
