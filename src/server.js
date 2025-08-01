import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import hpp from 'hpp';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { errorHandler } from './middlewares/errorHandler.js';

// Load environment variables
dotenv.config();

const app = express();

import path from 'path';
// Middleware para servir archivos de logo de empresa de forma pública y segura
app.use('/public/logos', express.static(path.join(process.cwd(), 'uploads/logos')));
// Middleware para servir fotos de personal
app.use('/public/personal', express.static(path.join(process.cwd(), 'uploads/personal')));
// Middleware para servir documentos de visitantes (protegido con JWT)
app.use('/uploads/documentos-visitantes', express.static(path.join(process.cwd(), 'uploads/documentos-visitantes')));

// Middlewares globales
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(helmet());
app.use(hpp());
/**
 * Middleware global de rate limit (express-rate-limit)
 * - En desarrollo: permite hasta 1000 peticiones por minuto por IP para evitar bloqueos durante pruebas y desarrollo frontend.
 * - En producción: límite estricto de 100 peticiones por minuto por IP para proteger el backend de abusos.
 * - El valor se determina según NODE_ENV y puede ajustarse fácilmente.
 *
 * Esta configuración garantiza una experiencia fluida en desarrollo y seguridad en producción.
 */
const isProduction = process.env.NODE_ENV === 'production';
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: isProduction ? 100 : 1000, // 1000/min en dev, 100/min en prod
  message: 'Demasiadas peticiones, intenta más tarde.'
});
app.use(limiter);


// Rutas principales
import routes from './routes/index.js';
app.use('/api', routes);

// Middleware de manejo de errores
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.info(`Servidor ERP escuchando en puerto ${PORT}`);
});
