import User from '../models/User.js';
import Person from '../models/Person.js';
import { generateToken } from '../utils/jwt.js';

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
      .populate('person')
      .populate('roles');

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

    // Generar token
    const token = generateToken(user._id);

    // Obtener permisos agrupados por rol
    const Option = await import('../models/Option.js').then(m => m.default);
    const permisosPorRol = [];

    for (const rol of user.roles) {
      const opciones = await Option.find({
        roles: rol._id,
        activo: true
      })
      .populate('module')
      .sort({ 'module.orden': 1, orden: 1 });

      const modulosConOpciones = {};
      
      opciones.forEach(opcion => {
        const moduleId = opcion.module._id.toString();
        
        if (!modulosConOpciones[moduleId]) {
          modulosConOpciones[moduleId] = {
            module: {
              _id: opcion.module._id,
              nombre: opcion.module.nombre,
              descripcion: opcion.module.descripcion,
              orden: opcion.module.orden
            },
            opciones: []
          };
        }
        
        modulosConOpciones[moduleId].opciones.push({
          _id: opcion._id,
          nombre: opcion.nombre,
          ruta: opcion.ruta,
          orden: opcion.orden
        });
      });

      permisosPorRol.push({
        rol: {
          _id: rol._id,
          nombre: rol.nombre,
          icono: rol.icono,
          descripcion: rol.descripcion
        },
        modulos: Object.values(modulosConOpciones)
      });
    }

    // Remover password de la respuesta
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(200).json({
      success: true,
      data: {
        token,
        user: userResponse,
        permisos: permisosPorRol
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
      password,
      roles
    } = req.body;

    // Validar campos requeridos
    if (!nombres || !apellidos || !tipoDocumento || !numeroDocumento || !fechaNacimiento) {
      const error = new Error('Todos los campos de persona son requeridos');
      error.statusCode = 400;
      return next(error);
    }

    if (!username || !email || !password || !roles || roles.length === 0) {
      const error = new Error('Username, email, password y al menos un rol son requeridos');
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

    // Crear usuario
    const user = await User.create({
      username,
      email,
      password,
      person: person._id,
      roles
    });

    // Poblar datos
    await user.populate('person');
    await user.populate('roles');

    // Generar token
    const token = generateToken(user._id);

    // Obtener permisos
    const permisos = await user.obtenerPermisos();

    // Remover password de la respuesta
    const userResponse = user.toObject();
    delete userResponse.password;

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
    // req.user ya viene del middleware protect
    const permisos = await req.user.obtenerPermisos();

    res.status(200).json({
      success: true,
      data: {
        user: req.user,
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
    const Option = await import('../models/Option.js').then(m => m.default);
    
    // Estructura: ROL → MÓDULO → OPCIONES
    const permisosPorRol = [];

    for (const rol of req.user.roles) {
      // Obtener todas las opciones de este rol específico
      const opciones = await Option.find({
        roles: rol._id,
        activo: true
      })
      .populate('module')
      .sort({ 'module.orden': 1, orden: 1 });

      // Agrupar opciones por módulo
      const modulosConOpciones = {};
      
      opciones.forEach(opcion => {
        const moduleId = opcion.module._id.toString();
        
        if (!modulosConOpciones[moduleId]) {
          modulosConOpciones[moduleId] = {
            module: {
              _id: opcion.module._id,
              nombre: opcion.module.nombre,
              descripcion: opcion.module.descripcion,
              orden: opcion.module.orden
            },
            opciones: []
          };
        }
        
        modulosConOpciones[moduleId].opciones.push({
          _id: opcion._id,
          nombre: opcion.nombre,
          ruta: opcion.ruta,
          orden: opcion.orden
        });
      });

      // Agregar el rol con sus módulos y opciones
      permisosPorRol.push({
        rol: {
          _id: rol._id,
          nombre: rol.nombre,
          icono: rol.icono,
          descripcion: rol.descripcion
        },
        modulos: Object.values(modulosConOpciones)
      });
    }

    res.status(200).json({
      success: true,
      data: permisosPorRol
    });
  } catch (error) {
    next(error);
  }
};
