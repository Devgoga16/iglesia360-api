import Module from '../models/Module.js';

// @desc    Obtener todos los módulos
// @route   GET /api/modules
export const getModules = async (req, res, next) => {
  try {
    const modules = await Module.find({ activo: true }).sort({ orden: 1 });
    res.status(200).json({
      success: true,
      count: modules.length,
      data: modules
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtener un módulo por ID
// @route   GET /api/modules/:id
export const getModuleById = async (req, res, next) => {
  try {
    const module = await Module.findById(req.params.id);
    
    if (!module) {
      const error = new Error('Módulo no encontrado');
      error.statusCode = 404;
      return next(error);
    }

    res.status(200).json({
      success: true,
      data: module
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Crear nuevo módulo
// @route   POST /api/modules
export const createModule = async (req, res, next) => {
  try {
    const module = await Module.create(req.body);
    res.status(201).json({
      success: true,
      data: module
    });
  } catch (error) {
    if (error.code === 11000) {
      error.message = 'El nombre del módulo ya existe';
      error.statusCode = 400;
    }
    next(error);
  }
};

// @desc    Actualizar módulo
// @route   PUT /api/modules/:id
export const updateModule = async (req, res, next) => {
  try {
    const module = await Module.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!module) {
      const error = new Error('Módulo no encontrado');
      error.statusCode = 404;
      return next(error);
    }

    res.status(200).json({
      success: true,
      data: module
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Eliminar módulo (soft delete)
// @route   DELETE /api/modules/:id
export const deleteModule = async (req, res, next) => {
  try {
    const module = await Module.findByIdAndUpdate(
      req.params.id,
      { activo: false },
      { new: true }
    );

    if (!module) {
      const error = new Error('Módulo no encontrado');
      error.statusCode = 404;
      return next(error);
    }

    res.status(200).json({
      success: true,
      message: 'Módulo eliminado correctamente'
    });
  } catch (error) {
    next(error);
  }
};
