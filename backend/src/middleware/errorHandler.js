// ============================================================
// MIDDLEWARE: Manejo de Errores Global (errorHandler)
// Descripción: Captura, loguea y unifica las respuestas de error en Express
// ============================================================

const errorHandler = (err, req, res, next) => {
  // Si las cabeceras ya fueron enviadas al cliente, delegamos al manejador por defecto de Express
  if (res.headersSent) {
    return next(err);
  }

  // Registrar el error en consola con colores o logs estructurados
  console.error('❌ [ERROR CAPTURADO POR MIDDLEWARE GLOBAL]:');
  console.error(err.stack || err);

  const statusCode = err.statusCode || err.status || 500;
  const environment = process.env.NODE_ENV || 'development';

  // Mensaje amigable para el cliente
  const errorMessage = err.message || 'Ocurrió un error interno en el servidor.';

  // Respuesta unificada compatible con múltiples convenciones del frontend
  const errorResponse = {
    ok: false,
    message: errorMessage,
    mensaje: errorMessage
  };

  // Adjuntar el stack trace únicamente en entornos de desarrollo para depuración
  if (environment === 'development') {
    errorResponse.stack = err.stack;
    errorResponse.errorDetails = err;
  }

  res.status(statusCode).json(errorResponse);
};

module.exports = errorHandler;
