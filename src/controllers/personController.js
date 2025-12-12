import Person from '../models/Person.js';
import PersonBranchRole from '../models/PersonBranchRole.js';
import {
  normalizeAssignmentsInput,
  persistPersonAssignments,
  getAssignmentsMap
} from '../services/personAssignmentsService.js';

const attachAssignments = async (persons) => {
  const personArray = Array.isArray(persons) ? persons : [persons];

  if (!personArray.length) {
    return Array.isArray(persons) ? [] : null;
  }

  const ids = personArray.map((person) => person._id);
  const assignmentsMap = await getAssignmentsMap(ids);

  const mapper = (person) => ({
    ...person,
    assignments: assignmentsMap[person._id.toString()] || []
  });

  if (Array.isArray(persons)) {
    return personArray.map(mapper);
  }

  return mapper(personArray[0]);
};

const buildPersonResponse = async (personId) => {
  const person = await Person.findById(personId)
    .populate({
      path: 'branches',
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
    })
    .lean();

  if (!person) {
    return null;
  }

  const [enriched] = await attachAssignments([person]);
  return enriched;
};

// @desc    Obtener todas las personas
// @route   GET /api/persons
export const getPersons = async (req, res, next) => {
  try {
    const persons = await Person.find({ activo: true })
      .populate({
        path: 'branches',
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
      })
      .lean();

    const data = await attachAssignments(persons);
    res.status(200).json({
      success: true,
      count: data.length,
      data
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtener una persona por ID
// @route   GET /api/persons/:id
export const getPersonById = async (req, res, next) => {
  try {
    const person = await buildPersonResponse(req.params.id);

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
    const assignments = await normalizeAssignmentsInput(req.body.assignments, { required: true });
    const personPayload = { ...req.body };
    delete personPayload.assignments;

    const person = await Person.create(personPayload);
    await persistPersonAssignments(person._id, assignments);
    const data = await buildPersonResponse(person._id);

    res.status(201).json({
      success: true,
      data
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
    const assignments = await normalizeAssignmentsInput(req.body.assignments);
    const updatePayload = { ...req.body };
    delete updatePayload.assignments;

    const person = await Person.findByIdAndUpdate(
      req.params.id,
      updatePayload,
      { new: true, runValidators: true }
    );

    if (!person) {
      const error = new Error('Persona no encontrada');
      error.statusCode = 404;
      return next(error);
    }

    if (assignments) {
      await persistPersonAssignments(person._id, assignments);
    }

    const data = await buildPersonResponse(person._id);

    res.status(200).json({
      success: true,
      data
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
      { activo: false, branches: [] },
      { new: true }
    );

    if (!person) {
      const error = new Error('Persona no encontrada');
      error.statusCode = 404;
      return next(error);
    }

    await PersonBranchRole.updateMany({ person: person._id }, { activo: false });

    res.status(200).json({
      success: true,
      message: 'Persona eliminada correctamente'
    });
  } catch (error) {
    next(error);
  }
};
