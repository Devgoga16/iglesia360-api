import express from 'express';
import {
  createBranch,
  getBranchById,
  getBranches,
  toggleBranchStatus,
  updateBranch
} from '../controllers/branchController.js';
import { authorize, protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getBranches)
  .post(authorize('Administrador'), createBranch);

router.route('/:id')
  .get(getBranchById)
  .put(authorize('Administrador'), updateBranch);

router.route('/:id/status')
  .patch(authorize('Administrador'), toggleBranchStatus);

export default router;
