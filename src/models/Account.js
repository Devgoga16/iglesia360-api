import mongoose from 'mongoose';

const accountSchema = new mongoose.Schema({
  // Persona titular de la cuenta
  person: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Person',
    required: [true, 'La persona titular es requerida'],
    index: true
  },
  // Alias o nombre amigable para identificar la cuenta
  alias: {
    type: String,
    trim: true,
    maxlength: [100, 'El alias no puede exceder 100 caracteres']
  },
  // Banco al que pertenece la cuenta
  bankName: {
    type: String,
    required: [true, 'El nombre del banco es requerido'],
    trim: true
  },
  // Número de cuenta principal
  accountNumber: {
    type: String,
    required: [true, 'El número de cuenta es requerido'],
    trim: true
  },
  // Código de Cuenta Interbancario (CCI)
  accountNumberCCI: {
    type: String,
    trim: true,
    maxlength: [20, 'El CCI no puede exceder 20 caracteres']
  },
  // Tipo de documento asociado a la cuenta
  docType: {
    type: String,
    trim: true
  },
  // Número del documento asociado a la cuenta
  docNumber: {
    type: String,
    trim: true
  },
  // Estado lógico de la cuenta
  active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

accountSchema.index({ person: 1, accountNumber: 1 }, { unique: true });

const Account = mongoose.model('Account', accountSchema);

export default Account;
