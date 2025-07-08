export function errorHandler(err, req, res, next) {
  // Registro simple del error en consola
  console.error({
    message: err.message,
    stack: err.stack,
    status: err.status || 500,
    url: req.originalUrl,
    method: req.method,
    user: req.user ? req.user.id : null,
  });

  res.status(err.status || 500).json({
    mensaje: err.mensaje || 'Error interno del servidor',
    codigo: err.codigo || 'ERR_INTERNO',
    detalles: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
}
