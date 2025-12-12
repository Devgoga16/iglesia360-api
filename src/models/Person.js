import mongoose from 'mongoose';

const personSchema = new mongoose.Schema({
  // Nombres del miembro registrados oficialmente
  nombres: {
    type: String,
    required: [true, 'Los nombres son requeridos'],
    trim: true
  },
  // Apellidos del miembro
  apellidos: {
    type: String,
    required: [true, 'Los apellidos son requeridos'],
    trim: true
  },
  // Tipo de documento de identidad proporcionado
  tipoDocumento: {
    type: String,
    enum: ['DNI', 'Pasaporte', 'Cédula', 'RUC'],
    required: [true, 'El tipo de documento es requerido']
  },
  // Número del documento de identidad
  numeroDocumento: {
    type: String,
    required: [true, 'El número de documento es requerido'],
    unique: true,
    trim: true
  },
  // Fecha de nacimiento del miembro
  fechaNacimiento: {
    type: Date,
    required: [true, 'La fecha de nacimiento es requerida']
  },
  // Teléfono de contacto principal
  telefono: {
    type: String,
    trim: true
  },
  // Dirección domiciliaria declarada
  direccion: {
    type: String,
    trim: true
  },
  // Sucursales asignadas a la persona (puede participar en múltiples)
  branches: {
    type: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch'
    }],
    default: []
  },
  // Marca de estado lógico para la persona
  activo: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Índice para búsquedas
personSchema.index({ numeroDocumento: 1 });
personSchema.index({ apellidos: 1, nombres: 1 });
personSchema.index({ branches: 1 });

// Virtual para nombre completo
personSchema.virtual('nombreCompleto').get(function() {
  return `${this.nombres} ${this.apellidos}`;
});

// Virtual de compatibilidad para exponer la primera sucursal como branch
personSchema.virtual('branch').get(function() {
  if (!Array.isArray(this.branches) || this.branches.length === 0) {
    return null;
  }
  return this.branches[0];
});

// Virtual para relacionar al usuario asociado
personSchema.virtual('user', {
  ref: 'User',
  localField: '_id',
  foreignField: 'person',
  justOne: true
});

// Asegurar que los virtuals se incluyan en JSON
personSchema.set('toJSON', { virtuals: true });
personSchema.set('toObject', { virtuals: true });

const Person = mongoose.model('Person', personSchema);

export default Person;
