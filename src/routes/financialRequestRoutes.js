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

/**
 * @swagger
 * /api/financial-requests:
 *   get:
 *     summary: Listar solicitudes financieras
 *     tags: [FinancialRequests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [CREATED, APPROVED_NETWORK, APPROVED_LEAD, APPROVED_ADMIN, MONEY_DELIVERED, EXPENSES_SUBMITTED, REMAINDER_REFUNDED, CLOSED, REJECTED]
 *         description: Filtrar por estado de la solicitud
 *       - in: query
 *         name: branchId
 *         schema:
 *           type: string
 *         description: Filtrar por sucursal
 *       - in: query
 *         name: requesterUserId
 *         schema:
 *           type: string
 *         description: Filtrar por usuario solicitante
 *     responses:
 *       200:
 *         description: Listado de solicitudes financieras
 *   post:
 *     summary: Crear solicitud financiera
 *     tags: [FinancialRequests]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - branchId
 *               - description
 *               - depositType
 *               - items
 *             properties:
 *               branchId:
 *                 type: string
 *                 description: ID de la sucursal
 *               requesterUserId:
 *                 type: string
 *                 description: ID del solicitante (opcional, por defecto el usuario autenticado)
 *               description:
 *                 type: string
 *                 description: Descripción general de la solicitud
 *               currency:
 *                 type: string
 *                 enum: [PEN, USD]
 *                 description: Moneda (opcional, por defecto PEN)
 *               costCenterId:
 *                 type: string
 *                 description: ID del centro de costo (opcional)
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - description
 *                     - amount
 *                   properties:
 *                     description:
 *                       type: string
 *                     amount:
 *                       type: number
 *                 description: Lista de items de gasto
 *               depositType:
 *                 type: string
 *                 enum: [OWN_ACCOUNT, EXTERNAL]
 *                 description: Tipo de abono
 *               ownAccountId:
 *                 type: string
 *                 description: ID de la cuenta propia (requerido si depositType es OWN_ACCOUNT)
 *               bankName:
 *                 type: string
 *                 description: Nombre del banco (requerido si depositType es EXTERNAL)
 *               accountNumber:
 *                 type: string
 *                 description: Número de cuenta (requerido si depositType es EXTERNAL)
 *               accountNumberCCI:
 *                 type: string
 *                 description: CCI de la cuenta (opcional para EXTERNAL)
 *               docType:
 *                 type: string
 *                 description: Tipo de documento (opcional)
 *               docNumber:
 *                 type: string
 *                 description: Número de documento (opcional)
 *     responses:
 *       201:
 *         description: Solicitud creada exitosamente
 */
router.route('/')
  .get(getFinancialRequests)
  .post(createFinancialRequest);

/**
 * @swagger
 * /api/financial-requests/{id}:
 *   get:
 *     summary: Obtener solicitud financiera por ID
 *     tags: [FinancialRequests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la solicitud financiera
 *     responses:
 *       200:
 *         description: Solicitud encontrada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     stateStepper:
 *                       type: array
 *                       description: Lista de estados relevantes para esta solicitud con su estado de completado
 *                       items:
 *                         type: object
 *                         properties:
 *                           status:
 *                             type: string
 *                             enum: [CREATED, APPROVED_NETWORK, APPROVED_LEAD, APPROVED_ADMIN, MONEY_DELIVERED, EXPENSES_SUBMITTED, REMAINDER_REFUNDED, CLOSED, REJECTED]
 *                           completed:
 *                             type: boolean
 *       404:
 *         description: Solicitud no encontrada
 *   put:
 *     summary: Actualizar solicitud financiera
 *     tags: [FinancialRequests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la solicitud financiera
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               description:
 *                 type: string
 *               currency:
 *                 type: string
 *                 enum: [PEN, USD]
 *               depositType:
 *                 type: string
 *                 enum: [OWN_ACCOUNT, EXTERNAL]
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
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     description:
 *                       type: string
 *                     amount:
 *                       type: number
 *               costCenterId:
 *                 type: string
 *               branchId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Solicitud actualizada exitosamente
 *       404:
 *         description: Solicitud no encontrada
 */
router.route('/:id')
  .get(getFinancialRequestById)
  .put(updateFinancialRequest);

/**
 * @swagger
 * /api/financial-requests/{id}/status:
 *   patch:
 *     summary: Cambiar estado de solicitud financiera
 *     tags: [FinancialRequests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la solicitud financiera
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [APPROVED_NETWORK, APPROVED_LEAD, APPROVED_ADMIN, MONEY_DELIVERED, EXPENSES_SUBMITTED, REMAINDER_REFUNDED, CLOSED, REJECTED]
 *                 description: Nuevo estado de la solicitud
 *               evidenceUrls:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: URLs de evidencia (requerido para ciertos estados)
 *               rejectionReason:
 *                 type: string
 *                 description: Motivo de rechazo (requerido si status es REJECTED)
 *               metadata:
 *                 type: object
 *                 description: Información adicional
 *               remainderAmount:
 *                 type: number
 *                 description: Monto remanente devuelto (para REMAINDER_REFUNDED)
 *     responses:
 *       200:
 *         description: Estado cambiado exitosamente
 *       400:
 *         description: Error en la solicitud
 *       403:
 *         description: No tiene permisos para cambiar el estado
 *       404:
 *         description: Solicitud no encontrada
 */
router.route('/:id/status')
  .patch(changeFinancialRequestStatus);

export default router;
