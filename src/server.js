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
// Middleware para servir fotos de productos
app.use('/public/productos', express.static(path.join(process.cwd(), 'uploads/productos')));
// Middleware para servir fotos de embarcaciones
app.use('/public/embarcaciones', express.static(path.join(process.cwd(), 'uploads/embarcaciones')));
// Middleware para servir fichas técnicas de productos
app.use('/public/fichas-tecnicas', express.static(path.join(process.cwd(), 'uploads/fichas-tecnicas')));
// Middleware para servir fichas técnicas de boliches red
app.use('/public/fichas-tecnicas-boliches', express.static(path.join(process.cwd(), 'uploads/fichas-tecnicas-boliches')));
// Middleware para servir certificados de embarcaciones
app.use('/public/certificados-embarcacion', express.static(path.join(process.cwd(), 'uploads/certificados-embarcacion')));
// Middleware para servir documentos de visitantes (protegido con JWT)
app.use('/uploads/documentos-visitantes', express.static(path.join(process.cwd(), 'uploads/documentos-visitantes')));
// Middleware para servir PDFs de movimientos de almacén
app.use('/uploads/movimientos-almacen', express.static(path.join(process.cwd(), 'uploads/movimientos-almacen')));
// Middleware para servir PDFs de requerimientos de compra
app.use('/uploads/requerimientos-compra', express.static(path.join(process.cwd(), 'uploads/requerimientos-compra')));
// Middleware para servir PDFs de órdenes de compra
app.use('/uploads/ordenes-compra', express.static(path.join(process.cwd(), 'uploads/ordenes-compra')));

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

// Rutas públicas de consultas externas (RENIEC y SUNAT) - ANTES del middleware JWT
import consultaExternaRoutes from './routes/Maestros/consultaExterna.routes.js';
app.use('/api/consultas-externas', consultaExternaRoutes);

// Rutas principales (protegidas por JWT)
import routes from './routes/index.js';
app.use('/api', routes);

// Middleware de manejo de errores
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.info(`Servidor ERP escuchando en puerto ${PORT}`);
});
