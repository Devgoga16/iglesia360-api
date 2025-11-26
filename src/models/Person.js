import mongoose from 'mongoose';

const personSchema = new mongoose.Schema({
  nombres: {
    type: String,
    required: [true, 'Los nombres son requeridos'],
    trim: true
  },
  apellidos: {
    type: String,
    required: [true, 'Los apellidos son requeridos'],
    trim: true
  },
  tipoDocumento: {
    type: String,
    enum: ['DNI', 'Pasaporte', 'Cédula', 'RUC'],
    required: [true, 'El tipo de documento es requerido']
  },
  numeroDocumento: {
    type: String,
    required: [true, 'El número de documento es requerido'],
    unique: true,
    trim: true
  },
  fechaNacimiento: {
    type: Date,
    required: [true, 'La fecha de nacimiento es requerida']
  },
  telefono: {
    type: String,
    trim: true
  },
  direccion: {
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
personSchema.index({ numeroDocumento: 1 });
personSchema.index({ apellidos: 1, nombres: 1 });

// Virtual para nombre completo
personSchema.virtual('nombreCompleto').get(function() {
  return `${this.nombres} ${this.apellidos}`;
});

// Asegurar que los virtuals se incluyan en JSON
personSchema.set('toJSON', { virtuals: true });
personSchema.set('toObject', { virtuals: true });

const Person = mongoose.model('Person', personSchema);

export default Person;
