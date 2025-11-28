import mongoose from 'mongoose';

const moduleSchema = new mongoose.Schema({
  // Nombre público del módulo de navegación
  nombre: {
    type: String,
    required: [true, 'El nombre del módulo es requerido'],
    unique: true,
    trim: true
  },
  // Descripción corta del propósito del módulo
  descripcion: {
    type: String,
    trim: true
  },
  // Posición en el orden de visualización
  orden: {
    type: Number,
    default: 0
  },
  // Marca de disponibilidad del módulo
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
