import mongoose from 'mongoose';

const rolSchema = new mongoose.Schema({
  // Nombre único que identifica el rol
  nombre: {
    type: String,
    required: [true, 'El nombre del rol es requerido'],
    unique: true,
    trim: true
  },
  // Icono asociado para la interfaz
  icono: {
    type: String,
    trim: true,
    default: 'fas fa-user'
  },
  // Descripción breve del alcance del rol
  descripcion: {
    type: String,
    trim: true
  },
  // Estado lógico del rol
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
