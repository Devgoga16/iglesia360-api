import express from 'express';
import {
  getOptions,
  getOptionsByModule,
  getOptionById,
  createOption,
  updateOption,
  deleteOption
} from '../controllers/optionController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

/**
 * @swagger
 * /api/options:
 *   get:
 *     summary: Obtener todas las opciones
 *     tags: [Options]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de opciones obtenida exitosamente
 *   post:
 *     summary: Crear nueva opción
 *     tags: [Options]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nombre
 *               - module
 *               - roles
 *             properties:
 *               nombre:
 *                 type: string
 *                 example: Crear Evento
 *               ruta:
 *                 type: string
 *                 example: /eventos/crear
 *               icono:
 *                 type: string
 *                 example: fas fa-plus
 *               orden:
 *                 type: number
 *                 example: 1
 *               module:
 *                 type: string
 *                 example: 507f1f77bcf86cd799439011
 *               roles:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["507f1f77bcf86cd799439011"]
 *     responses:
 *       201:
 *         description: Opción creada exitosamente
 */
router.route('/')
  .get(protect, getOptions)
  .post(protect, authorize('Administrador'), createOption);

/**
 * @swagger
 * /api/options/module/{moduleId}:
 *   get:
 *     summary: Obtener opciones por módulo
 *     tags: [Options]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: moduleId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Opciones del módulo obtenidas exitosamente
 */
router.get('/module/:moduleId', protect, getOptionsByModule);

/**
 * @swagger
 * /api/options/{id}:
 *   get:
 *     summary: Obtener opción por ID
 *     tags: [Options]
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
 *         description: Opción encontrada
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *   put:
 *     summary: Actualizar opción
 *     tags: [Options]
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
 *         description: Opción actualizada exitosamente
 *   delete:
 *     summary: Eliminar opción
 *     tags: [Options]
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
 *         description: Opción eliminada exitosamente
 */
router.route('/:id')
  .get(protect, getOptionById)
  .put(protect, authorize('Administrador'), updateOption)
  .delete(protect, authorize('Administrador'), deleteOption);

export default router;
