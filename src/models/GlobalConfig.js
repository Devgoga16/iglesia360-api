import mongoose from 'mongoose';

export const CURRENCIES = Object.freeze({
  PEN: 'PEN',
  USD: 'USD'
});

const globalConfigSchema = new mongoose.Schema({
  // Monto máximo permitido antes de requerir aprobación de pastor titular
  maxAmountLeadApproval: {
    type: Number,
    default: 500,
    min: [0, 'El monto máximo debe ser mayor o igual a 0']
  },
  // Moneda por defecto utilizada en las solicitudes
  defaultCurrency: {
    type: String,
    enum: Object.values(CURRENCIES),
    default: CURRENCIES.PEN
  },
  // Información del destino donde se devuelven remanentes
  remainderTarget: {
    // Nombre de la cuenta receptora
    accountName: {
      type: String,
      trim: true,
      default: null
    },
    // Banco asociado a la cuenta receptora
    bankName: {
      type: String,
      trim: true,
      default: null
    },
    // Número de cuenta para recibir remanentes
    accountNumber: {
      type: String,
      trim: true,
      default: null
    },
    // Notas descriptivas adicionales para la devolución
    notes: {
      type: String,
      trim: true,
      default: null
    }
  }
}, {
  timestamps: true
});

globalConfigSchema.statics.getConfig = async function() {
  let config = await this.findOne();

  if (!config) {
    config = await this.create({});
  }

  return config;
};

const GlobalConfig = mongoose.model('GlobalConfig', globalConfigSchema);

export default GlobalConfig;
