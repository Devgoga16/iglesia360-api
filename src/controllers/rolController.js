import Rol from '../models/Rol.js';

// @desc    Obtener todos los roles
// @route   GET /api/roles
export const getRoles = async (req, res, next) => {
  try {
    const roles = await Rol.find({ activo: true });
    res.status(200).json({
      success: true,
      count: roles.length,
      data: roles
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtener un rol por ID
// @route   GET /api/roles/:id
export const getRolById = async (req, res, next) => {
  try {
    const rol = await Rol.findById(req.params.id);
    
    if (!rol) {
      const error = new Error('Rol no encontrado');
      error.statusCode = 404;
      return next(error);
    }

    res.status(200).json({
      success: true,
      data: rol
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Crear nuevo rol
// @route   POST /api/roles
export const createRol = async (req, res, next) => {
  try {
    const rol = await Rol.create(req.body);
    res.status(201).json({
      success: true,
      data: rol
    });
  } catch (error) {
    if (error.code === 11000) {
      error.message = 'El nombre del rol ya existe';
      error.statusCode = 400;
    }
    next(error);
  }
};

// @desc    Actualizar rol
// @route   PUT /api/roles/:id
export const updateRol = async (req, res, next) => {
  try {
    const rol = await Rol.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!rol) {
      const error = new Error('Rol no encontrado');
      error.statusCode = 404;
      return next(error);
    }

    res.status(200).json({
      success: true,
      data: rol
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Eliminar rol (soft delete)
// @route   DELETE /api/roles/:id
export const deleteRol = async (req, res, next) => {
  try {
    const rol = await Rol.findByIdAndUpdate(
      req.params.id,
      { activo: false },
      { new: true }
    );

    if (!rol) {
      const error = new Error('Rol no encontrado');
      error.statusCode = 404;
      return next(error);
    }

    res.status(200).json({
      success: true,
      message: 'Rol eliminado correctamente'
    });
  } catch (error) {
    next(error);
  }
};
