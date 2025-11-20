import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import connectDB from './config/database.js';
import { config } from './config/config.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

// Importar rutas
import userRoutes from './routes/userRoutes.js';

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

// Ruta de health check
app.get('/health', (req, res) => {
  res.status(200).json({ 
    success: true, 
    message: 'API funcionando correctamente',
    timestamp: new Date().toISOString()
  });
});

// Rutas principales
app.use('/api/users', userRoutes);

// Manejo de errores
app.use(notFound);
app.use(errorHandler);

const PORT = config.port;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT} - Ambiente: ${config.env}`);
});

export default app;
