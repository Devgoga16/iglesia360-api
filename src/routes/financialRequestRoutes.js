import express from 'express';
import {
  changeFinancialRequestStatus,
  createFinancialRequest,
  getFinancialRequestById,
  getFinancialRequests,
  updateFinancialRequest
} from '../controllers/financialRequestController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getFinancialRequests)
  .post(createFinancialRequest);

router.route('/:id')
  .get(getFinancialRequestById)
  .put(updateFinancialRequest);

router.route('/:id/status')
  .patch(changeFinancialRequestStatus);

export default router;
