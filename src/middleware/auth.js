import User from '../models/User.js';
import { verifyToken } from '../utils/jwt.js';

/**
 * Middleware para proteger rutas - requiere autenticación
 */
export const protect = async (req, res, next) => {
  let token;

  // Verificar si el token está en los headers
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // Verificar si el token existe
  if (!token) {
    const error = new Error('No autorizado. Token no proporcionado');
    error.statusCode = 401;
    return next(error);
  }

  try {
    // Verificar token
    const decoded = verifyToken(token);

    // Obtener usuario del token (incluir password:false pero sí roles y person)
    const user = await User.findById(decoded.id)
      .select('-password')
      .populate('person')
      .populate('roles')
      .populate('branch', 'name');

    if (!user) {
      const error = new Error('Usuario no encontrado');
      error.statusCode = 401;
      return next(error);
    }

    // Verificar si el usuario está activo
    if (!user.activo) {
      const error = new Error('Usuario inactivo');
      error.statusCode = 401;
      return next(error);
    }

    // Verificar si el usuario está bloqueado
    if (user.estaBloqueado()) {
      const error = new Error('Usuario bloqueado temporalmente. Intente más tarde');
      error.statusCode = 403;
      return next(error);
    }

    // Agregar usuario a la request
    req.user = user;
    next();
  } catch (error) {
    error.statusCode = 401;
    error.message = 'No autorizado. Token inválido';
    next(error);
  }
};

/**
 * Middleware para verificar roles específicos
 */
export const authorize = (...rolesPermitidos) => {
  return async (req, res, next) => {
    if (!req.user) {
      const error = new Error('Usuario no autenticado');
      error.statusCode = 401;
      return next(error);
    }

    // Obtener nombres de roles del usuario
    const userRoles = req.user.roles.map(rol => (rol.nombre || '').toUpperCase());
    const requiredRoles = rolesPermitidos.map(rol => rol.toUpperCase());

    // Verificar si el usuario tiene alguno de los roles permitidos
    const tienePermiso = requiredRoles.some(rol => userRoles.includes(rol));

    if (!tienePermiso) {
      const error = new Error(`No tiene permisos. Roles requeridos: ${rolesPermitidos.join(', ')}`);
      error.statusCode = 403;
      return next(error);
    }

    next();
  };
};

/**
 * Middleware para verificar permisos por opción/módulo
 */
export const checkPermission = (opcionNombre) => {
  return async (req, res, next) => {
    if (!req.user) {
      const error = new Error('Usuario no autenticado');
      error.statusCode = 401;
      return next(error);
    }

    try {
      // Obtener permisos del usuario
      const opciones = await req.user.obtenerPermisos();
      
      // Verificar si tiene acceso a la opción
      const tieneAcceso = opciones.some(opcion => opcion.nombre === opcionNombre);

      if (!tieneAcceso) {
        const error = new Error(`No tiene permisos para acceder a: ${opcionNombre}`);
        error.statusCode = 403;
        return next(error);
      }

      next();
    } catch (error) {
      error.statusCode = 500;
      next(error);
    }
  };
};
