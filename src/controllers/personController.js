import mongoose from 'mongoose';
import Branch from '../models/Branch.js';
import Person from '../models/Person.js';

// @desc    Obtener todas las personas
// @route   GET /api/persons
export const getPersons = async (req, res, next) => {
  try {
    const persons = await Person.find({ activo: true })
      .populate({
        path: 'branch',
        select: 'name parentBranch',
        populate: { path: 'parentBranch', select: 'name' }
      })
      .populate({
        path: 'user',
        select: 'username email roles branch activo',
        populate: [
          { path: 'branch', select: 'name' },
          { path: 'roles', select: 'nombre' }
        ]
      });
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
    const person = await Person.findById(req.params.id)
      .populate({
        path: 'branch',
        select: 'name parentBranch',
        populate: { path: 'parentBranch', select: 'name' }
      })
      .populate({
        path: 'user',
        select: 'username email roles branch activo',
        populate: [
          { path: 'branch', select: 'name' },
          { path: 'roles', select: 'nombre' }
        ]
      });
    
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
    if (!req.body.branch) {
      const error = new Error('Debe especificar la sucursal de la persona');
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

    const person = await Person.create(req.body);
    await person.populate({
      path: 'branch',
      select: 'name parentBranch',
      populate: { path: 'parentBranch', select: 'name' }
    });
    await person.populate({
      path: 'user',
      select: 'username email roles branch activo',
      populate: [
        { path: 'branch', select: 'name' },
        { path: 'roles', select: 'nombre' }
      ]
    });
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

    const person = await Person.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate({
        path: 'branch',
        select: 'name parentBranch',
        populate: { path: 'parentBranch', select: 'name' }
      })
      .populate({
        path: 'user',
        select: 'username email roles branch activo',
        populate: [
          { path: 'branch', select: 'name' },
          { path: 'roles', select: 'nombre' }
        ]
      });

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
