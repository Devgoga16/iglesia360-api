import express from 'express';
import {
  getModules,
  getModuleById,
  createModule,
  updateModule,
  deleteModule
} from '../controllers/moduleController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

/**
 * @swagger
 * /api/modules:
 *   get:
 *     summary: Obtener todos los módulos
 *     tags: [Modules]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de módulos obtenida exitosamente
 *   post:
 *     summary: Crear nuevo módulo
 *     tags: [Modules]
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
 *             properties:
 *               nombre:
 *                 type: string
 *                 example: Eventos
 *               descripcion:
 *                 type: string
 *                 example: Gestión de eventos de la iglesia
 *               icono:
 *                 type: string
 *                 example: fas fa-calendar
 *               orden:
 *                 type: number
 *                 example: 6
 *     responses:
 *       201:
 *         description: Módulo creado exitosamente
 */
router.route('/')
  .get(protect, getModules)
  .post(protect, authorize('Administrador'), createModule);

/**
 * @swagger
 * /api/modules/{id}:
 *   get:
 *     summary: Obtener módulo por ID
 *     tags: [Modules]
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
 *         description: Módulo encontrado
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *   put:
 *     summary: Actualizar módulo
 *     tags: [Modules]
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
 *         description: Módulo actualizado exitosamente
 *   delete:
 *     summary: Eliminar módulo
 *     tags: [Modules]
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
 *         description: Módulo eliminado exitosamente
 */
router.route('/:id')
  .get(protect, getModuleById)
  .put(protect, authorize('Administrador'), updateModule)
  .delete(protect, authorize('Administrador'), deleteModule);

export default router;
