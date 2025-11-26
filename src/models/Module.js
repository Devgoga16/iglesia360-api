import mongoose from 'mongoose';

const moduleSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: [true, 'El nombre del módulo es requerido'],
    unique: true,
    trim: true
  },
  descripcion: {
    type: String,
    trim: true
  },
  orden: {
    type: Number,
    default: 0
  },
  activo: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Índice para búsquedas y ordenamiento
moduleSchema.index({ orden: 1 });
moduleSchema.index({ nombre: 1 });

const Module = mongoose.model('Module', moduleSchema);

export default Module;
