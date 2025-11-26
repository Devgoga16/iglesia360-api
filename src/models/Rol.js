import mongoose from 'mongoose';

const rolSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: [true, 'El nombre del rol es requerido'],
    unique: true,
    trim: true
  },
  icono: {
    type: String,
    trim: true,
    default: 'fas fa-user'
  },
  descripcion: {
    type: String,
    trim: true
  },
  activo: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Índice para búsquedas
rolSchema.index({ nombre: 1 });

const Rol = mongoose.model('Rol', rolSchema);

export default Rol;
