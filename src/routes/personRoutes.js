import express from 'express';
import {
  getPersons,
  getPersonById,
  createPerson,
  updatePerson,
  deletePerson
} from '../controllers/personController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

/**
 * @swagger
 * /api/persons:
 *   get:
 *     summary: Obtener todas las personas
 *     tags: [Persons]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de personas obtenida exitosamente
 *       401:
 *         $ref: '#/components/responses/NotFound'
 *   post:
 *     summary: Crear nueva persona
 *     tags: [Persons]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nombres
 *               - apellidos
 *               - tipoDocumento
 *               - numeroDocumento
 *               - fechaNacimiento
 *             properties:
 *               nombres:
 *                 type: string
 *                 example: Juan Carlos
 *               apellidos:
 *                 type: string
 *                 example: Pérez García
 *               tipoDocumento:
 *                 type: string
 *                 enum: [DNI, Pasaporte, Cédula, RUC]
 *                 example: DNI
 *               numeroDocumento:
 *                 type: string
 *                 example: "12345678"
 *               fechaNacimiento:
 *                 type: string
 *                 format: date
 *                 example: "1990-05-15"
 *               telefono:
 *                 type: string
 *                 example: "+52 123 456 7890"
 *               direccion:
 *                 type: string
 *                 example: Av. Principal 123
 *     responses:
 *       201:
 *         description: Persona creada exitosamente
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 */
router.route('/')
  .get(protect, getPersons)
  .post(protect, authorize('Administrador', 'Pastor'), createPerson);

/**
 * @swagger
 * /api/persons/{id}:
 *   get:
 *     summary: Obtener persona por ID
 *     tags: [Persons]
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
 *         description: Persona encontrada
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *   put:
 *     summary: Actualizar persona
 *     tags: [Persons]
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
 *         description: Persona actualizada exitosamente
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *   delete:
 *     summary: Eliminar persona
 *     tags: [Persons]
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
 *         description: Persona eliminada exitosamente
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.route('/:id')
  .get(protect, getPersonById)
  .put(protect, authorize('Administrador', 'Pastor'), updatePerson)
  .delete(protect, authorize('Administrador'), deletePerson);

export default router;
