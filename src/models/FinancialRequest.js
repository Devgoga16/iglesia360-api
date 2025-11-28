import mongoose from 'mongoose';
import { CURRENCIES } from './GlobalConfig.js';

export const FINANCIAL_REQUEST_STATUS = Object.freeze({
  CREATED: 'CREATED',
  APPROVED_NETWORK: 'APPROVED_NETWORK',
  APPROVED_LEAD: 'APPROVED_LEAD',
  APPROVED_ADMIN: 'APPROVED_ADMIN',
  MONEY_DELIVERED: 'MONEY_DELIVERED',
  EXPENSES_SUBMITTED: 'EXPENSES_SUBMITTED',
  REMAINDER_REFUNDED: 'REMAINDER_REFUNDED',
  CLOSED: 'CLOSED',
  REJECTED: 'REJECTED'
});

export const DEPOSIT_TYPES = Object.freeze({
  OWN_ACCOUNT: 'OWN_ACCOUNT',
  EXTERNAL: 'EXTERNAL'
});

const requestItemSchema = new mongoose.Schema({
  // Descripción concreta del gasto requerido
  description: {
    type: String,
    required: [true, 'La descripción del item es requerida'],
    trim: true,
    minlength: [3, 'La descripción debe tener al menos 3 caracteres'],
    maxlength: [200, 'La descripción no puede exceder 200 caracteres']
  },
  // Monto monetario asociado al ítem
  amount: {
    type: Number,
    required: [true, 'El monto del item es requerido'],
    min: [0, 'El monto del item debe ser mayor o igual a 0']
  }
}, { _id: false });

const statusHistorySchema = new mongoose.Schema({
  // Estado al que transicionó la solicitud
  status: {
    type: String,
    enum: Object.values(FINANCIAL_REQUEST_STATUS),
    required: true
  },
  // Fecha y hora de la transición registrada
  changedAt: {
    type: Date,
    default: Date.now
  },
  // Usuario responsable de la transición
  changedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Marca si el paso representa aprobación
  approved: {
    type: Boolean,
    default: true
  },
  // Motivo escrito en caso de rechazo
  rejectionReason: {
    type: String,
    trim: true,
    maxlength: [300, 'El motivo de rechazo no puede exceder 300 caracteres']
  },
  // Evidencias asociadas (urls) para justificar el paso
  evidenceUrls: [{
    type: String,
    trim: true
  }],
  // Información adicional específica del estado
  metadata: {
    type: Object,
    default: null
  }
}, { _id: false });

const financialRequestSchema = new mongoose.Schema({
  // Sucursal desde la cual se origina la solicitud
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: [true, 'La sucursal es requerida'],
    index: true
  },
  // Usuario que supervisa y aprueba la solicitud
  supervisorUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Usuario que crea o solicita los fondos
  requesterUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'El solicitante es requerido'],
    index: true
  },
  // Resumen general del propósito del gasto
  description: {
    type: String,
    required: [true, 'La descripción general es requerida'],
    trim: true,
    minlength: [10, 'La descripción debe tener al menos 10 caracteres'],
    maxlength: [500, 'La descripción no puede exceder 500 caracteres']
  },
  // Moneda en la que se expresan los montos
  currency: {
    type: String,
    enum: Object.values(CURRENCIES),
    default: CURRENCIES.PEN
  },
  // Centro de costo asociado, si aplica
  costCenter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CostCenter',
    default: null
  },
  // Monto total calculado para la solicitud
  totalAmount: {
    type: Number,
    required: [true, 'El monto total es requerido'],
    min: [0, 'El monto total debe ser mayor o igual a 0']
  },
  // Detalle de ítems que componen la solicitud
  items: {
    type: [requestItemSchema],
    validate: {
      validator: (value) => Array.isArray(value) && value.length > 0,
      message: 'Debe proporcionar al menos un item de gasto'
    }
  },
  // Tipo de abono definido para la entrega de fondos
  depositType: {
    type: String,
    enum: Object.values(DEPOSIT_TYPES),
    required: [true, 'El tipo de abono es requerido']
  },
  // Identificador interno de la cuenta propia cuando corresponde
  ownAccountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    default: null
  },
  // Banco destino cuando el depósito es externo
  bankName: {
    type: String,
    trim: true
  },
  // Número de cuenta destino para depósitos externos
  accountNumber: {
    type: String,
    trim: true
  },
  // Código de Cuenta Interbancario (CCI) para depósitos externos
  accountNumberCCI: {
    type: String,
    trim: true,
    maxlength: [20, 'El CCI no puede exceder 20 caracteres']
  },
  // Tipo de documento que respalda la entrega
  docType: {
    type: String,
    trim: true
  },
  // Número del documento que respalda la entrega
  docNumber: {
    type: String,
    trim: true
  },
  // Indicador de si requiere aprobación adicional del pastor titular
  requiresLeadApproval: {
    type: Boolean,
    default: false
  },
  // Estado actual de la solicitud dentro del flujo
  currentStatus: {
    type: String,
    enum: Object.values(FINANCIAL_REQUEST_STATUS),
    default: FINANCIAL_REQUEST_STATUS.CREATED,
    index: true
  },
  // Historial cronológico de cambios de estado
  statusHistory: {
    type: [statusHistorySchema],
    default: []
  },
  // Monto devuelto como remanente cuando aplica
  remainderAmount: {
    type: Number,
    default: 0,
    min: [0, 'El monto del remanente no puede ser negativo']
  }
}, {
  timestamps: true
});

financialRequestSchema.methods.canTransitionTo = function(nextStatus) {
  const requiresLeadApproval = this.requiresLeadApproval;

  const allowed = {
    [FINANCIAL_REQUEST_STATUS.CREATED]: [FINANCIAL_REQUEST_STATUS.APPROVED_NETWORK],
    [FINANCIAL_REQUEST_STATUS.APPROVED_NETWORK]: requiresLeadApproval
      ? [FINANCIAL_REQUEST_STATUS.APPROVED_LEAD]
      : [FINANCIAL_REQUEST_STATUS.APPROVED_ADMIN],
    [FINANCIAL_REQUEST_STATUS.APPROVED_LEAD]: [FINANCIAL_REQUEST_STATUS.APPROVED_ADMIN],
    [FINANCIAL_REQUEST_STATUS.APPROVED_ADMIN]: [FINANCIAL_REQUEST_STATUS.MONEY_DELIVERED],
    [FINANCIAL_REQUEST_STATUS.MONEY_DELIVERED]: [FINANCIAL_REQUEST_STATUS.EXPENSES_SUBMITTED],
    [FINANCIAL_REQUEST_STATUS.EXPENSES_SUBMITTED]: [
      FINANCIAL_REQUEST_STATUS.REMAINDER_REFUNDED,
      FINANCIAL_REQUEST_STATUS.CLOSED
    ],
    [FINANCIAL_REQUEST_STATUS.REMAINDER_REFUNDED]: [FINANCIAL_REQUEST_STATUS.CLOSED],
    [FINANCIAL_REQUEST_STATUS.CLOSED]: [],
    [FINANCIAL_REQUEST_STATUS.REJECTED]: []
  };

  const extraTransitions = [];

  if (
    this.currentStatus !== FINANCIAL_REQUEST_STATUS.CLOSED &&
    this.currentStatus !== FINANCIAL_REQUEST_STATUS.REJECTED
  ) {
    extraTransitions.push(FINANCIAL_REQUEST_STATUS.REJECTED);
  }

  const allowedNext = [...(allowed[this.currentStatus] || []), ...extraTransitions];

  return allowedNext.includes(nextStatus);
};

financialRequestSchema.pre('validate', function(next) {
  if (this.depositType === DEPOSIT_TYPES.OWN_ACCOUNT) {
    if (!this.ownAccountId) {
      return next(new Error('Debe especificar la cuenta de abono propia'));
    }

    if (!mongoose.Types.ObjectId.isValid(this.ownAccountId)) {
      return next(new Error('El identificador de la cuenta propia es inválido'));
    }
  }

  if (this.ownAccountId && !mongoose.Types.ObjectId.isValid(this.ownAccountId)) {
    return next(new Error('El identificador de la cuenta propia es inválido'));
  }

  if (this.depositType === DEPOSIT_TYPES.EXTERNAL) {
    if (!this.bankName || !this.accountNumber) {
      return next(new Error('Debe proporcionar el banco y número de cuenta para depósitos externos'));
    }
  }

  if (Array.isArray(this.items)) {
    const total = this.items.reduce((acc, item) => acc + (item.amount || 0), 0);
    this.totalAmount = total;
  }

  next();
});

const FinancialRequest = mongoose.model('FinancialRequest', financialRequestSchema);

export default FinancialRequest;
