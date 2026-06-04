// ============================================================
// src/api/middleware/errorHandler.js
// ============================================================
export function errorHandler(err, _req, res, _next) {
  console.error('[ErrorHandler]', err);

  const status = err.statusCode || 500;
  res.status(status).json({
    error: err.message || 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}
