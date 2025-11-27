import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  // Username único usado para iniciar sesión
  username: {
    type: String,
    required: [true, 'El nombre de usuario es requerido'],
    unique: true,
    trim: true,
    lowercase: true,
    minlength: [3, 'El username debe tener al menos 3 caracteres']
  },
  // Correo electrónico principal del usuario
  email: {
    type: String,
    required: [true, 'El email es requerido'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Email inválido']
  },
  // Hash de la contraseña del usuario
  password: {
    type: String,
    required: [true, 'La contraseña es requerida'],
    minlength: [6, 'La contraseña debe tener al menos 6 caracteres'],
    select: false // No incluir password en queries por defecto
  },
  // Referencia a los datos personales del usuario
  person: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Person',
    required: [true, 'La persona es requerida']
  },
  // Sucursal asignada al usuario dentro de la organización
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch'
  },
  // Lista de roles asociados para permisos
  roles: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Rol',
    required: [true, 'Debe tener al menos un rol']
  }],
  // Fecha del último acceso exitoso
  ultimoAcceso: {
    type: Date
  },
  // Conteo de intentos fallidos de autenticación
  intentosFallidos: {
    type: Number,
    default: 0
  },
  // Momento hasta el cual el usuario permanece bloqueado
  bloqueadoHasta: {
    type: Date
  },
  // Estado lógico del usuario dentro del sistema
  activo: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Índices para optimizar búsquedas y autenticación
userSchema.index({ username: 1 });
userSchema.index({ email: 1 });
userSchema.index({ person: 1 });
userSchema.index({ roles: 1 });
userSchema.index({ branch: 1 });

// Hook pre-save para hashear password
userSchema.pre('save', async function(next) {
  // Solo hashear si el password fue modificado
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Método para comparar passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Error al comparar contraseñas');
  }
};

// Método para verificar si el usuario está bloqueado
userSchema.methods.estaBloqueado = function() {
  if (this.bloqueadoHasta && this.bloqueadoHasta > new Date()) {
    return true;
  }
  return false;
};

// Método para incrementar intentos fallidos
userSchema.methods.incrementarIntentosFallidos = async function() {
  this.intentosFallidos += 1;
  
  // Bloquear después de 5 intentos fallidos por 15 minutos
  if (this.intentosFallidos >= 5) {
    this.bloqueadoHasta = new Date(Date.now() + 15 * 60 * 1000);
  }
  
  await this.save();
};

// Método para resetear intentos fallidos
userSchema.methods.resetearIntentosFallidos = async function() {
  this.intentosFallidos = 0;
  this.bloqueadoHasta = undefined;
  this.ultimoAcceso = new Date();
  await this.save();
};

// Método para obtener permisos del usuario
userSchema.methods.obtenerPermisos = async function() {
  await this.populate('roles');
  
  const Option = mongoose.model('Option');
  const roleIds = this.roles.map(rol => rol._id);
  
  const opciones = await Option.find({
    roles: { $in: roleIds },
    activo: true
  })
  .populate('module')
  .sort({ 'module.orden': 1, orden: 1 });
  
  return opciones;
};

const User = mongoose.model('User', userSchema);

export default User;
