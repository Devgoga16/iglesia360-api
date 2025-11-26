import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: [true, 'El nombre es requerido'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'El email es requerido'],
    unique: true,
    lowercase: true,
    trim: true
  },
  telefono: {
    type: String,
    trim: true
  },
  rol: {
    type: String,
    enum: ['admin', 'pastor', 'lider', 'miembro'],
    default: 'miembro'
  },
  activo: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

const User = mongoose.model('User', userSchema);

export default User;
