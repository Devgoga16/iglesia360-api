import mongoose from 'mongoose';

const optionSchema = new mongoose.Schema({
  // Nombre descriptivo de la opción de menú
  nombre: {
    type: String,
    required: [true, 'El nombre de la opción es requerido'],
    trim: true
  },
  // Ruta o enlace que representa la opción
  ruta: {
    type: String,
    trim: true
  },
  // Posición dentro del conjunto de opciones
  orden: {
    type: Number,
    default: 0
  },
  // Módulo al que pertenece la opción
  module: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Module',
    required: [true, 'El módulo es requerido']
  },
  // Roles autorizados para visualizar la opción
  roles: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Rol'
  }],
  // Indica si la opción está activa
  activo: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Índices para optimizar búsquedas
optionSchema.index({ module: 1, orden: 1 });
optionSchema.index({ roles: 1 });
optionSchema.index({ nombre: 1 });

// Índice compuesto para prevenir duplicados en el mismo módulo
optionSchema.index({ nombre: 1, module: 1 }, { unique: true });

const Option = mongoose.model('Option', optionSchema);

export default Option;
