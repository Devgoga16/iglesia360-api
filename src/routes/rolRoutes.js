import express from 'express';
import {
  getRoles,
  getRolById,
  createRol,
  updateRol,
  deleteRol
} from '../controllers/rolController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

/**
 * @swagger
 * /api/roles:
 *   get:
 *     summary: Obtener todos los roles
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de roles obtenida exitosamente
 *   post:
 *     summary: Crear nuevo rol
 *     tags: [Roles]
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
 *                 example: Líder de Jóvenes
 *               icono:
 *                 type: string
 *                 example: fas fa-star
 *               descripcion:
 *                 type: string
 *                 example: Gestión de ministerio juvenil
 *     responses:
 *       201:
 *         description: Rol creado exitosamente
 */
router.route('/')
  .get(protect, getRoles)
  .post(protect, authorize('Administrador'), createRol);

/**
 * @swagger
 * /api/roles/{id}:
 *   get:
 *     summary: Obtener rol por ID
 *     tags: [Roles]
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
 *         description: Rol encontrado
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *   put:
 *     summary: Actualizar rol
 *     tags: [Roles]
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
 *         description: Rol actualizado exitosamente
 *   delete:
 *     summary: Eliminar rol
 *     tags: [Roles]
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
 *         description: Rol eliminado exitosamente
 */
router.route('/:id')
  .get(protect, getRolById)
  .put(protect, authorize('Administrador'), updateRol)
  .delete(protect, authorize('Administrador'), deleteRol);

export default router;
