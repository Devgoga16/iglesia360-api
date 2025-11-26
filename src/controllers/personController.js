import Person from '../models/Person.js';

// @desc    Obtener todas las personas
// @route   GET /api/persons
export const getPersons = async (req, res, next) => {
  try {
    const persons = await Person.find({ activo: true });
    res.status(200).json({
      success: true,
      count: persons.length,
      data: persons
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtener una persona por ID
// @route   GET /api/persons/:id
export const getPersonById = async (req, res, next) => {
  try {
    const person = await Person.findById(req.params.id);
    
    if (!person) {
      const error = new Error('Persona no encontrada');
      error.statusCode = 404;
      return next(error);
    }

    res.status(200).json({
      success: true,
      data: person
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Crear nueva persona
// @route   POST /api/persons
export const createPerson = async (req, res, next) => {
  try {
    const person = await Person.create(req.body);
    res.status(201).json({
      success: true,
      data: person
    });
  } catch (error) {
    if (error.code === 11000) {
      error.message = 'El número de documento ya está registrado';
      error.statusCode = 400;
    }
    next(error);
  }
};

// @desc    Actualizar persona
// @route   PUT /api/persons/:id
export const updatePerson = async (req, res, next) => {
  try {
    const person = await Person.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!person) {
      const error = new Error('Persona no encontrada');
      error.statusCode = 404;
      return next(error);
    }

    res.status(200).json({
      success: true,
      data: person
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Eliminar persona (soft delete)
// @route   DELETE /api/persons/:id
export const deletePerson = async (req, res, next) => {
  try {
    const person = await Person.findByIdAndUpdate(
      req.params.id,
      { activo: false },
      { new: true }
    );

    if (!person) {
      const error = new Error('Persona no encontrada');
      error.statusCode = 404;
      return next(error);
    }

    res.status(200).json({
      success: true,
      message: 'Persona eliminada correctamente'
    });
  } catch (error) {
    next(error);
  }
};
