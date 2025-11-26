import mongoose from 'mongoose';

const optionSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: [true, 'El nombre de la opción es requerido'],
    trim: true
  },
  ruta: {
    type: String,
    trim: true
  },
  orden: {
    type: Number,
    default: 0
  },
  module: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Module',
    required: [true, 'El módulo es requerido']
  },
  roles: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Rol'
  }],
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
