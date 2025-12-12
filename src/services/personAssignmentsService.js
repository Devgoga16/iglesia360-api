import mongoose from 'mongoose';
import Branch from '../models/Branch.js';
import Rol from '../models/Rol.js';
import Person from '../models/Person.js';
import PersonBranchRole from '../models/PersonBranchRole.js';

const toStringObjectId = (value) => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'string') {
    return value.trim();
  }

  if (value instanceof mongoose.Types.ObjectId) {
    return value.toString();
  }

  if (typeof value === 'object' && value._id) {
    return value._id.toString();
  }

  return value.toString();
};

const unique = (values) => [...new Set(values)];

const ensureValidBranchIds = async (branchIds) => {
  if (!branchIds.length) {
    return;
  }

  const invalidId = branchIds.find((branchId) => !mongoose.Types.ObjectId.isValid(branchId));

  if (invalidId) {
    const error = new Error('El identificador de la sucursal es inválido');
    error.statusCode = 400;
    throw error;
  }

  const count = await Branch.countDocuments({ _id: { $in: branchIds } });

  if (count !== branchIds.length) {
    const error = new Error('Una o más sucursales indicadas no existen');
    error.statusCode = 404;
    throw error;
  }
};

const ensureValidRoleIds = async (roleIds) => {
  if (!roleIds.length) {
    return;
  }

  const invalidId = roleIds.find((roleId) => !mongoose.Types.ObjectId.isValid(roleId));

  if (invalidId) {
    const error = new Error('El identificador del rol es inválido');
    error.statusCode = 400;
    throw error;
  }

  const count = await Rol.countDocuments({ _id: { $in: roleIds } });

  if (count !== roleIds.length) {
    const error = new Error('Uno o más roles indicados no existen');
    error.statusCode = 404;
    throw error;
  }
};

export const normalizeAssignmentsInput = async (assignments, { required } = { required: false }) => {
  if (!assignments && assignments !== 0) {
    if (required) {
      const error = new Error('Debe especificar asignaciones de sucursal y roles');
      error.statusCode = 400;
      throw error;
    }
    return null;
  }

  const rawAssignments = Array.isArray(assignments) ? assignments : [];

  if (!rawAssignments.length) {
    const error = new Error('Debe especificar al menos una asignación de sucursal y roles');
    error.statusCode = 400;
    throw error;
  }

  const sanitized = rawAssignments.map((assignment) => {
    const branchId = toStringObjectId(assignment?.branch || assignment?.branchId);

    if (!branchId) {
      const error = new Error('Cada asignación debe especificar una sucursal');
      error.statusCode = 400;
      throw error;
    }

    const roles = unique(
      (Array.isArray(assignment?.roles) ? assignment.roles : [])
        .map((roleId) => toStringObjectId(roleId))
        .filter(Boolean)
    );

    if (!roles.length) {
      const error = new Error('Cada asignación debe incluir al menos un rol');
      error.statusCode = 400;
      throw error;
    }

    return {
      branch: branchId,
      roles,
      isPrimary: Boolean(assignment?.isPrimary),
      activo: assignment?.activo === false ? false : true
    };
  });

  const branchIds = unique(sanitized.map((assignment) => assignment.branch));

  if (branchIds.length !== sanitized.length) {
    const error = new Error('No puede repetir la misma sucursal dentro de las asignaciones');
    error.statusCode = 400;
    throw error;
  }

  await ensureValidBranchIds(branchIds);

  const roleIds = unique(sanitized.flatMap((assignment) => assignment.roles));
  await ensureValidRoleIds(roleIds);

  const primaryCount = sanitized.filter((assignment) => assignment.isPrimary).length;

  if (primaryCount > 1) {
    const error = new Error('Solo una asignación puede marcarse como primaria');
    error.statusCode = 400;
    throw error;
  }

  if (primaryCount === 0) {
    sanitized[0].isPrimary = true;
  }

  return sanitized;
};

const refreshPersonBranches = async (personId) => {
  const activeAssignments = await PersonBranchRole.find({ person: personId, activo: true })
    .select('branch')
    .lean();

  const seen = new Set();
  const uniqueBranches = [];

  activeAssignments.forEach((assignment) => {
    if (!assignment.branch) {
      return;
    }
    const key = assignment.branch.toString();
    if (!seen.has(key)) {
      seen.add(key);
      uniqueBranches.push(assignment.branch);
    }
  });

  await Person.findByIdAndUpdate(personId, { branches: uniqueBranches });
};

export const persistPersonAssignments = async (personId, assignments) => {
  if (!assignments) {
    return;
  }

  await PersonBranchRole.deleteMany({ person: personId });

  if (assignments.length) {
    const docs = assignments.map((assignment) => ({
      person: personId,
      branch: assignment.branch,
      roles: assignment.roles,
      isPrimary: assignment.isPrimary,
      activo: assignment.activo
    }));

    await PersonBranchRole.insertMany(docs);
  }

  await refreshPersonBranches(personId);
};

export const getAssignmentsMap = async (personIds, { includeInactive = false } = {}) => {
  if (!personIds.length) {
    return {};
  }

  const query = { person: { $in: personIds } };

  if (!includeInactive) {
    query.activo = true;
  }

  const assignments = await PersonBranchRole.find(query)
    .populate({
      path: 'branch',
      select: 'name parentBranch',
      populate: { path: 'parentBranch', select: 'name' }
    })
    .populate({ path: 'roles', select: 'nombre descripcion icono' })
    .lean();

  return assignments.reduce((acc, assignment) => {
    const key = assignment.person.toString();
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(assignment);
    return acc;
  }, {});
};

export const getPersonAssignments = async (personId, options = {}) => {
  const map = await getAssignmentsMap([personId], options);
  return map[personId.toString()] || [];
};

export const aggregateRolesFromAssignments = (assignments) => unique(
  (assignments || [])
    .filter((assignment) => assignment.activo !== false)
    .flatMap((assignment) => assignment.roles)
    .map((role) => role.toString())
);

export const findAssignmentByBranch = (assignments, branchId) => {
  if (!branchId) {
    return null;
  }

  return (assignments || []).find(
    (assignment) => assignment.branch.toString() === branchId.toString()
  ) || null;
};

export const getPrimaryAssignment = (assignments) => {
  if (!Array.isArray(assignments) || !assignments.length) {
    return null;
  }

  return assignments.find((assignment) => assignment.isPrimary) || assignments[0];
};
