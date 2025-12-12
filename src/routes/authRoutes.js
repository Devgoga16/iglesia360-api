import express from 'express';
import {
  login,
  register,
  getMe,
  updatePassword,
  getPermissions
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login de usuario
 *     tags: [Auth]
 *     description: Autentica un usuario y retorna un token JWT
 *     parameters:
 *       - in: header
 *         name: x-branch-id
 *         required: false
 *         schema:
 *           type: string
 *         description: ID de sucursal que el cliente desea activar para la sesión (puede enviarse también como branchId en el cuerpo)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 description: Username o email del usuario
 *                 example: admin
 *               password:
 *                 type: string
 *                 description: Contraseña del usuario
 *                 example: password123
 *               branchId:
 *                 type: string
 *                 description: ID de sucursal a activar (prioridad sobre el header)
 *                 example: "665b3afcdf2a4e0d9c125b42"
 *     responses:
 *       200:
 *         description: Login exitoso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/AuthEnvelope'
 *       401:
 *         $ref: '#/components/responses/NotFound'
 */
router.post('/login', login);

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Registrar nuevo usuario
 *     tags: [Auth]
 *     description: Crea una nueva persona y usuario en el sistema
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
 *               - username
 *               - email
 *               - password
 *               - assignments
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
 *               username:
 *                 type: string
 *                 example: juanperez
 *               email:
 *                 type: string
 *                 example: juan@iglesia.com
 *               password:
 *                 type: string
 *                 example: password123
 *               assignments:
 *                 type: array
 *                 description: Listado de sucursales y roles asignados (la primera se marca como primaria si ninguna lo está)
 *                 items:
 *                   $ref: '#/components/schemas/BranchAssignmentInput'
 *                 example:
 *                   - branch: "665b3afcdf2a4e0d9c125b42"
 *                     roles: ["665b3afcdf2a4e0d9c125b45", "665b3afcdf2a4e0d9c125b46"]
 *                     isPrimary: true
 *                   - branch: "665b3afcdf2a4e0d9c125b50"
 *                     roles: ["665b3afcdf2a4e0d9c125b48"]
 *     responses:
 *       201:
 *         description: Usuario creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/AuthEnvelope'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 */
router.post('/register', register);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Obtener perfil del usuario autenticado
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     description: Retorna la información del usuario actual y sus permisos
 *     parameters:
 *       - in: header
 *         name: x-branch-id
 *         required: false
 *         schema:
 *           type: string
 *         description: Sucursal a activar para recalcular permisos (si se omite usa la primaria)
 *     responses:
 *       200:
 *         description: Perfil obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/AuthEnvelope'
 *       401:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/me', protect, getMe);

/**
 * @swagger
 * /api/auth/updatepassword:
 *   put:
 *     summary: Actualizar contraseña
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     description: Permite al usuario cambiar su contraseña
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 example: oldpassword123
 *               newPassword:
 *                 type: string
 *                 example: newpassword123
 *     responses:
 *       200:
 *         description: Contraseña actualizada exitosamente
 *       401:
 *         $ref: '#/components/responses/NotFound'
 */
router.put('/updatepassword', protect, updatePassword);

/**
 * @swagger
 * /api/auth/permissions:
 *   get:
 *     summary: Obtener permisos del usuario
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     description: Retorna todos los módulos y opciones a los que el usuario tiene acceso
 *     parameters:
 *       - in: header
 *         name: x-branch-id
 *         required: false
 *         schema:
 *           type: string
 *         description: Sucursal a activar para devolver los permisos correspondientes
 *     responses:
 *       200:
 *         description: Permisos obtenidos exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   description: Lista de módulos/opciones calculados para la sucursal seleccionada
 *                   items:
 *                     type: object
 *       401:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/permissions', protect, getPermissions);

export default router;
