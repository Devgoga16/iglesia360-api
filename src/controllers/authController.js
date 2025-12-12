import User from '../models/User.js';
import Person from '../models/Person.js';
import Option from '../models/Option.js';
import { generateToken } from '../utils/jwt.js';
import {
  normalizeAssignmentsInput,
  persistPersonAssignments,
  getPersonAssignments,
  aggregateRolesFromAssignments,
  getPrimaryAssignment,
  findAssignmentByBranch
} from '../services/personAssignmentsService.js';

const buildPermissionsByRoles = async (roles = []) => {
  const roleRegistry = new Map();

  roles.forEach((role) => {
    if (!role) {
      return;
    }

    const roleId = role._id ? role._id.toString() : role.toString();

    if (!roleId) {
      return;
    }

    if (!roleRegistry.has(roleId)) {
      roleRegistry.set(roleId, {
        rol: role._id ? {
          _id: role._id,
          nombre: role.nombre,
          icono: role.icono,
          descripcion: role.descripcion
        } : { _id: roleId },
        modulos: [],
        modulesIndex: new Map()
      });
    }
  });

  const uniqueRoleIds = [...roleRegistry.keys()];

  if (!uniqueRoleIds.length) {
    return [];
  }

  const opciones = await Option.find({
    roles: { $in: uniqueRoleIds },
    activo: true
  })
    .populate('module')
    .sort({ 'module.orden': 1, orden: 1 })
    .lean();

  opciones.forEach((opcion) => {
    const moduleId = opcion.module._id.toString();
    const optionRoleIds = (opcion.roles || []).map((roleId) => roleId.toString());

    optionRoleIds.forEach((roleId) => {
      if (!roleRegistry.has(roleId)) {
        return;
      }

      const entry = roleRegistry.get(roleId);

      if (!entry.modulesIndex.has(moduleId)) {
        const modulePayload = {
          module: {
            _id: opcion.module._id,
            nombre: opcion.module.nombre,
            descripcion: opcion.module.descripcion,
            orden: opcion.module.orden
          },
          opciones: []
        };

        entry.modulesIndex.set(moduleId, modulePayload);
        entry.modulos.push(modulePayload);
      }

      entry.modulesIndex.get(moduleId).opciones.push({
        _id: opcion._id,
        nombre: opcion.nombre,
        ruta: opcion.ruta,
        orden: opcion.orden
      });
    });
  });

  return uniqueRoleIds.map((roleId) => {
    const { modulesIndex, ...entry } = roleRegistry.get(roleId);
    return {
      rol: entry.rol,
      modulos: entry.modulos
    };
  });
};

const hydrateBranchAssignments = async (assignments = []) => {
  const hydrated = [];

  for (const assignment of assignments) {
    const rolesWithPermissions = await buildPermissionsByRoles(assignment.roles);

    hydrated.push({
      _id: assignment._id,
      branch: assignment.branch,
      roles: rolesWithPermissions.map(({ rol, modulos }) => ({
        _id: rol._id,
        nombre: rol.nombre,
        icono: rol.icono,
        descripcion: rol.descripcion,
        modulos
      })),
      isPrimary: assignment.isPrimary,
      activo: assignment.activo
    });
  }

  return hydrated;
};

const resolveBranchId = (assignment) => {
  if (!assignment?.branch) {
    return null;
  }

  if (assignment.branch._id) {
    return assignment.branch._id.toString();
  }

  return assignment.branch.toString();
};

const resolveAssignmentsFromRequest = async (body) => {
  const assignmentsFromPayload = await normalizeAssignmentsInput(body.assignments);

  if (assignmentsFromPayload) {
    return assignmentsFromPayload;
  }

  if (body.branchId && Array.isArray(body.roles) && body.roles.length) {
    return normalizeAssignmentsInput([
      {
        branch: body.branchId,
        roles: body.roles,
        isPrimary: true
      }
    ], { required: true });
  }

  const error = new Error('Debe especificar assignments con sucursales y roles');
  error.statusCode = 400;
  throw error;
};

const selectAssignment = (assignments, branchId) => {
  const explicit = findAssignmentByBranch(assignments, branchId);
  return explicit || getPrimaryAssignment(assignments);
};

const buildAuthPayload = async ({ user, assignments, selectedAssignment }) => {
  if (!Array.isArray(assignments) || !assignments.length) {
    const error = new Error('El usuario no tiene sucursales activas configuradas');
    error.statusCode = 403;
    throw error;
  }

  const effectiveAssignment = selectedAssignment || getPrimaryAssignment(assignments);

  if (!effectiveAssignment) {
    const error = new Error('No se encontraron asignaciones válidas para el usuario');
    error.statusCode = 403;
    throw error;
  }

  const hydratedAssignments = await hydrateBranchAssignments(assignments);
  const effectiveId = effectiveAssignment._id?.toString();
  const activeAssignment = effectiveId
    ? hydratedAssignments.find((assignment) => assignment._id.toString() === effectiveId)
    : hydratedAssignments[0];

  const userResponse = user.toObject();
  delete userResponse.password;
  delete userResponse.branch;
  delete userResponse.roles;
  userResponse.assignments = hydratedAssignments;
  userResponse.activeAssignment = activeAssignment;
  userResponse.currentBranchId = resolveBranchId(activeAssignment);

  return {
    user: userResponse,
    permisos: activeAssignment?.roles || []
  };
};

const extractRequestedBranchId = (req) => {
  return req.body?.branchId || req.headers['x-branch-id'] || req.query?.branchId || null;
};

/**
 * @desc    Login de usuario
 * @route   POST /api/auth/login
 */
export const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    // Validar campos requeridos
    if (!username || !password) {
      const error = new Error('Username y password son requeridos');
      error.statusCode = 400;
      return next(error);
    }

    // Buscar usuario (incluir password para validación)
    const user = await User.findOne({
      $or: [{ username }, { email: username }]
    })
      .select('+password')
      .populate({ path: 'person', populate: { path: 'branches', select: 'name isChurch' } })
      .populate('roles')
      .populate({
        path: 'branch',
        select: 'name address isChurch active depth parentBranch manager managerUser',
        populate: [
          { path: 'parentBranch', select: 'name isChurch' },
          { path: 'manager', select: 'nombres apellidos numeroDocumento' },
          { path: 'managerUser', select: 'username email' }
        ]
      });

    if (!user) {
      const error = new Error('Credenciales inválidas');
      error.statusCode = 401;
      return next(error);
    }

    // Verificar si el usuario está activo
    if (!user.activo) {
      const error = new Error('Usuario inactivo. Contacte al administrador');
      error.statusCode = 401;
      return next(error);
    }

    // Verificar si está bloqueado
    if (user.estaBloqueado()) {
      const tiempoRestante = Math.ceil((user.bloqueadoHasta - new Date()) / 60000);
      const error = new Error(`Usuario bloqueado. Intente en ${tiempoRestante} minutos`);
      error.statusCode = 403;
      return next(error);
    }

    // Verificar password
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      // Incrementar intentos fallidos
      await user.incrementarIntentosFallidos();
      
      const error = new Error('Credenciales inválidas');
      error.statusCode = 401;
      return next(error);
    }

    // Resetear intentos fallidos
    await user.resetearIntentosFallidos();

    const personId = user.person?._id || user.person;
    const assignments = await getPersonAssignments(personId);
    const requestedBranchId = extractRequestedBranchId(req);
    const selectedAssignment = selectAssignment(assignments, requestedBranchId);

    const token = generateToken(user._id);
    const { user: userResponse, permisos } = await buildAuthPayload({
      user,
      assignments,
      selectedAssignment
    });

    res.status(200).json({
      success: true,
      data: {
        token,
        user: userResponse,
        permisos
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Registro de nuevo usuario
 * @route   POST /api/auth/register
 */
export const register = async (req, res, next) => {
  try {
    const { 
      // Datos de persona
      nombres, 
      apellidos, 
      tipoDocumento, 
      numeroDocumento,
      fechaNacimiento,
      telefono,
      direccion,
      // Datos de usuario
      username, 
      email, 
      password
    } = req.body;

    const assignmentsPayload = await resolveAssignmentsFromRequest(req.body);

    // Validar campos requeridos
    if (!nombres || !apellidos || !tipoDocumento || !numeroDocumento || !fechaNacimiento) {
      const error = new Error('Todos los campos de persona son requeridos');
      error.statusCode = 400;
      return next(error);
    }

    if (!username || !email || !password) {
      const error = new Error('Username, email y password son requeridos');
      error.statusCode = 400;
      return next(error);
    }

    // Verificar si ya existe el username o email
    const existingUser = await User.findOne({
      $or: [{ username }, { email }]
    });

    if (existingUser) {
      const error = new Error('Username o email ya existe');
      error.statusCode = 400;
      return next(error);
    }

    // Verificar si ya existe el documento
    const existingPerson = await Person.findOne({ numeroDocumento });
    
    if (existingPerson) {
      const error = new Error('El número de documento ya está registrado');
      error.statusCode = 400;
      return next(error);
    }

    // Crear persona
    const person = await Person.create({
      nombres,
      apellidos,
      tipoDocumento,
      numeroDocumento,
      fechaNacimiento,
      telefono,
      direccion
    });

    await persistPersonAssignments(person._id, assignmentsPayload);

    const aggregatedRoleIds = aggregateRolesFromAssignments(assignmentsPayload);
    const primaryAssignment = getPrimaryAssignment(assignmentsPayload);

    // Crear usuario
    const user = await User.create({
      username,
      email,
      password,
      person: person._id,
      roles: aggregatedRoleIds,
      branch: resolveBranchId(primaryAssignment)
    });

    const hydratedUser = await User.findById(user._id)
      .populate({ path: 'person', populate: { path: 'branches', select: 'name isChurch' } })
      .populate('roles')
      .populate({
        path: 'branch',
        select: 'name address isChurch active depth parentBranch manager managerUser',
        populate: [
          { path: 'parentBranch', select: 'name isChurch' },
          { path: 'manager', select: 'nombres apellidos numeroDocumento' },
          { path: 'managerUser', select: 'username email' }
        ]
      });

    const savedAssignments = await getPersonAssignments(person._id);
    const selectedAssignment = selectAssignment(savedAssignments, resolveBranchId(primaryAssignment));

    const token = generateToken(user._id);
    const { user: userResponse, permisos } = await buildAuthPayload({
      user: hydratedUser,
      assignments: savedAssignments,
      selectedAssignment
    });

    res.status(201).json({
      success: true,
      data: {
        token,
        user: userResponse,
        permisos
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Obtener perfil del usuario autenticado
 * @route   GET /api/auth/me
 */
export const getMe = async (req, res, next) => {
  try {
    const personId = req.user.person?._id || req.user.person;
    const assignments = await getPersonAssignments(personId);
    const requestedBranchId = extractRequestedBranchId(req) || resolveBranchId({ branch: req.user.branch });
    const selectedAssignment = selectAssignment(assignments, requestedBranchId);

    const token = generateToken(req.user._id);
    const { user: userData, permisos } = await buildAuthPayload({
      user: req.user,
      assignments,
      selectedAssignment
    });

    res.status(200).json({
      success: true,
      data: {
        token,
        user: userData,
        permisos
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Actualizar contraseña
 * @route   PUT /api/auth/updatepassword
 */
export const updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      const error = new Error('Contraseña actual y nueva son requeridas');
      error.statusCode = 400;
      return next(error);
    }

    if (newPassword.length < 6) {
      const error = new Error('La nueva contraseña debe tener al menos 6 caracteres');
      error.statusCode = 400;
      return next(error);
    }

    // Obtener usuario con password
    const user = await User.findById(req.user._id).select('+password');

    // Verificar contraseña actual
    const isMatch = await user.comparePassword(currentPassword);

    if (!isMatch) {
      const error = new Error('Contraseña actual incorrecta');
      error.statusCode = 401;
      return next(error);
    }

    // Actualizar contraseña
    user.password = newPassword;
    await user.save();

    // Generar nuevo token
    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      data: { token },
      message: 'Contraseña actualizada correctamente'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Obtener permisos del usuario agrupados por rol
 * @route   GET /api/auth/permissions
 */
export const getPermissions = async (req, res, next) => {
  try {
    const personId = req.user.person?._id || req.user.person;
    const assignments = await getPersonAssignments(personId);
    const requestedBranchId = extractRequestedBranchId(req) || resolveBranchId({ branch: req.user.branch });
    const selectedAssignment = selectAssignment(assignments, requestedBranchId);

    if (!selectedAssignment) {
      const error = new Error('No se encontraron asignaciones activas para el usuario');
      error.statusCode = 403;
      return next(error);
    }

    const permisos = await buildPermissionsByRoles(selectedAssignment.roles);

    res.status(200).json({
      success: true,
      data: permisos
    });
  } catch (error) {
    next(error);
  }
};
