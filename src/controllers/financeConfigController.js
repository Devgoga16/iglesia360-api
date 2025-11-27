import GlobalConfig, { CURRENCIES } from '../models/GlobalConfig.js';

// @desc    Obtener configuración financiera global
// @route   GET /api/financial-config
export const getFinanceConfig = async (req, res, next) => {
  try {
    const config = await GlobalConfig.getConfig();

    res.status(200).json({
      success: true,
      data: config
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Actualizar configuración financiera global
// @route   PATCH /api/financial-config
export const updateFinanceConfig = async (req, res, next) => {
  try {
    const config = await GlobalConfig.getConfig();
    const updates = {};

    if (Object.prototype.hasOwnProperty.call(req.body, 'maxAmountLeadApproval')) {
      const value = Number(req.body.maxAmountLeadApproval);

      if (Number.isNaN(value) || value < 0) {
        const error = new Error('El monto máximo debe ser un número mayor o igual a 0');
        error.statusCode = 400;
        throw error;
      }

      updates.maxAmountLeadApproval = value;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'defaultCurrency')) {
      const value = String(req.body.defaultCurrency).toUpperCase();

      if (!Object.values(CURRENCIES).includes(value)) {
        const error = new Error('Moneda no soportada');
        error.statusCode = 400;
        throw error;
      }

      updates.defaultCurrency = value;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'remainderTarget')) {
      const {
        accountName = null,
        bankName = null,
        accountNumber = null,
        notes = null
      } = req.body.remainderTarget || {};

      updates.remainderTarget = {
        accountName,
        bankName,
        accountNumber,
        notes
      };
    }

    Object.assign(config, updates);
    await config.save();

    res.status(200).json({
      success: true,
      data: config
    });
  } catch (error) {
    next(error);
  }
};
