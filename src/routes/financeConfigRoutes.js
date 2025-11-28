import express from 'express';
import {
  getFinanceConfig,
  updateFinanceConfig
} from '../controllers/financeConfigController.js';
import { authorize, protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getFinanceConfig)
  .patch(authorize('Administrador'), updateFinanceConfig);

export default router;
