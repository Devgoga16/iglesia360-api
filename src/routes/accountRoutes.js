import express from 'express';
import {
  getAccounts,
  getAccountById,
  createAccount,
  updateAccount,
  deleteAccount
} from '../controllers/accountController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

/**
 * @swagger
 * /api/accounts:
 *   get:
 *     summary: Listar cuentas bancarias del cliente autenticado
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: active
 *         schema:
 *           type: string
 *           enum: [true, false]
 *         description: Filtrar por estado activo
 *     responses:
 *       200:
 *         description: Listado de cuentas bancarias del cliente
 *   post:
 *     summary: Crear cuenta bancaria
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - person
 *               - bankName
 *               - accountNumber
 *             properties:
 *               person:
 *                 type: string
 *               alias:
 *                 type: string
 *               bankName:
 *                 type: string
 *               accountNumber:
 *                 type: string
 *               accountNumberCCI:
 *                 type: string
 *               docType:
 *                 type: string
 *               docNumber:
 *                 type: string
 *     responses:
 *       201:
 *         description: Cuenta creada exitosamente
 */
router.route('/')
  .get(protect, getAccounts)
  .post(protect, authorize('Administrador', 'Pastor'), createAccount);

/**
 * @swagger
 * /api/accounts/{id}:
 *   get:
 *     summary: Obtener cuenta bancaria por ID
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Cuenta encontrada
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *   put:
 *     summary: Actualizar cuenta bancaria
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Cuenta actualizada exitosamente
 *   delete:
 *     summary: Desactivar cuenta bancaria
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Cuenta desactivada exitosamente
 */
router.route('/:id')
  .get(protect, getAccountById)
  .put(protect, authorize('Administrador', 'Pastor'), updateAccount)
  .delete(protect, authorize('Administrador'), deleteAccount);

export default router;
