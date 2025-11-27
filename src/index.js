import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import connectDB from './config/database.js';
import { config } from './config/config.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import swaggerSpec from './config/swagger.js';

// Importar rutas
import userRoutes from './routes/userRoutes.js';
import authRoutes from './routes/authRoutes.js';
import personRoutes from './routes/personRoutes.js';
import rolRoutes from './routes/rolRoutes.js';
import moduleRoutes from './routes/moduleRoutes.js';
import optionRoutes from './routes/optionRoutes.js';
import branchRoutes from './routes/branchRoutes.js';
import financialRequestRoutes from './routes/financialRequestRoutes.js';
import financeConfigRoutes from './routes/financeConfigRoutes.js';

dotenv.config();

// Conectar a la base de datos
connectDB();

const app = express();

// Middlewares de seguridad
app.use(helmet());
app.use(cors({ origin: config.corsOrigin }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100 // límite de 100 peticiones por ventana
});
app.use('/api', limiter);

// Parseo de JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Iglesia 360 API Docs'
}));

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check
 *     tags: [Health]
 *     description: Verifica que la API esté funcionando correctamente
 *     responses:
 *       200:
 *         description: API funcionando correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: API funcionando correctamente
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
// Ruta de health check
app.get('/health', (req, res) => {
  res.status(200).json({ 
    success: true, 
    message: 'API funcionando correctamente',
    timestamp: new Date().toISOString()
  });
});

// Rutas principales
app.use('/api/auth', authRoutes);
app.use('/api/persons', personRoutes);
app.use('/api/roles', rolRoutes);
app.use('/api/modules', moduleRoutes);
app.use('/api/options', optionRoutes);
app.use('/api/users', userRoutes); // Deprecado - usar auth
app.use('/api/branches', branchRoutes);
app.use('/api/financial-requests', financialRequestRoutes);
app.use('/api/financial-config', financeConfigRoutes);

// Manejo de errores
app.use(notFound);
app.use(errorHandler);

const PORT = config.port;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT} - Ambiente: ${config.env}`);
});

export default app;
