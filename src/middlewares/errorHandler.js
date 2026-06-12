import AppError from '../utils/AppError.js';
import { DatabaseError } from '../utils/errors.js';

export function errorHandler(err, req, res, next) {
  console.error("═══════════════════════════════════════════════════════");
  console.error("🔴 [ERROR HANDLER] ERROR CAPTURADO");
  console.error("═══════════════════════════════════════════════════════");
  console.error("📍 URL:", req.method, req.originalUrl);
  console.error("👤 Usuario:", req.user?.id || "No autenticado");
  console.error("📦 Body:", JSON.stringify(req.body, null, 2));
  console.error("─────────────────────────────────────────────────────");
  console.error("❌ Error Name:", err.name);
  console.error("❌ Error Message:", err.message);
  console.error("❌ Error Status:", err.status || 500);
  console.error("❌ Error Code:", err.code || err.codigo || "N/A");
  console.error("❌ Error Stack:");
  console.error(err.stack);
  console.error("═══════════════════════════════════════════════════════");

  // Si es un error de Prisma, lo mapeamos a DatabaseError
  if (err.code && err.code.startsWith('P')) {
    console.error("🔴 [ERROR HANDLER] Error de Prisma detectado:", err.code);
    err = new DatabaseError('Error de base de datos', err.message);
  }

  const statusCode = err.status || 500;
  const errorResponse = {
    success: false,
    message: err.message || 'Error interno del servidor',
    mensaje: err.message || 'Error interno del servidor',
    codigo: err.codigo || err.code || 'ERR_INTERNO',
    status: statusCode,
  };

  // En desarrollo, incluir detalles adicionales
  if (process.env.NODE_ENV === 'development') {
    errorResponse.detalles = err.detalles || err.stack;
    errorResponse.stack = err.stack;
  }

  console.error("📤 [ERROR HANDLER] Enviando respuesta:", JSON.stringify(errorResponse, null, 2));

  res.status(statusCode).json(errorResponse);
}