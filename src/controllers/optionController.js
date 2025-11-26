import Option from '../models/Option.js';

// @desc    Obtener todas las opciones
// @route   GET /api/options
export const getOptions = async (req, res, next) => {
  try {
    const options = await Option.find({ activo: true })
      .populate('module')
      .populate('roles')
      .sort({ 'module.orden': 1, orden: 1 });
    
    res.status(200).json({
      success: true,
      count: options.length,
      data: options
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtener opciones por módulo
// @route   GET /api/options/module/:moduleId
export const getOptionsByModule = async (req, res, next) => {
  try {
    const options = await Option.find({ 
      module: req.params.moduleId,
      activo: true 
    })
      .populate('module')
      .populate('roles')
      .sort({ orden: 1 });
    
    res.status(200).json({
      success: true,
      count: options.length,
      data: options
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtener una opción por ID
// @route   GET /api/options/:id
export const getOptionById = async (req, res, next) => {
  try {
    const option = await Option.findById(req.params.id)
      .populate('module')
      .populate('roles');
    
    if (!option) {
      const error = new Error('Opción no encontrada');
      error.statusCode = 404;
      return next(error);
    }

    res.status(200).json({
      success: true,
      data: option
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Crear nueva opción
// @route   POST /api/options
export const createOption = async (req, res, next) => {
  try {
    const option = await Option.create(req.body);
    await option.populate('module');
    await option.populate('roles');
    
    res.status(201).json({
      success: true,
      data: option
    });
  } catch (error) {
    if (error.code === 11000) {
      error.message = 'Ya existe una opción con ese nombre en el módulo';
      error.statusCode = 400;
    }
    next(error);
  }
};

// @desc    Actualizar opción
// @route   PUT /api/options/:id
export const updateOption = async (req, res, next) => {
  try {
    const option = await Option.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('module')
      .populate('roles');

    if (!option) {
      const error = new Error('Opción no encontrada');
      error.statusCode = 404;
      return next(error);
    }

    res.status(200).json({
      success: true,
      data: option
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Eliminar opción (soft delete)
// @route   DELETE /api/options/:id
export const deleteOption = async (req, res, next) => {
  try {
    const option = await Option.findByIdAndUpdate(
      req.params.id,
      { activo: false },
      { new: true }
    );

    if (!option) {
      const error = new Error('Opción no encontrada');
      error.statusCode = 404;
      return next(error);
    }

    res.status(200).json({
      success: true,
      message: 'Opción eliminada correctamente'
    });
  } catch (error) {
    next(error);
  }
};
