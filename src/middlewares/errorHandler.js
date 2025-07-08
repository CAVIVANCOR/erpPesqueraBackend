import AppError from '../utils/AppError.js';
import { DatabaseError } from '../utils/errors.js';

export function errorHandler(err, req, res, next) {
  // Si es un error de Prisma, lo mapeamos a DatabaseError
  if (err.code && err.code.startsWith('P')) {
    err = new DatabaseError('Error de base de datos', err.message);
  }

  // Registro simple del error en consola
  console.error({
    message: err.message,
    stack: err.stack,
    status: err.status || 500,
    url: req.originalUrl,
    method: req.method,
    user: req.user ? req.user.id : null,
    codigo: err.codigo
  });

  res.status(err.status || 500).json({
    mensaje: err.message || 'Error interno del servidor',
    codigo: err.codigo || 'ERR_INTERNO',
    detalles: process.env.NODE_ENV === 'development' ? (err.detalles || err.stack) : undefined,
  });
}

