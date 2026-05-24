// ============================================================
// MIDDLEWARE: Rate Limiting (Limitador de Tasa de Peticiones)
// Descripción: Controla y mitiga ataques de fuerza bruta/DoS en memoria
// ============================================================

/**
 * Crea un limitador de peticiones en memoria basado en la dirección IP.
 * @param {Object} options Configuración del limitador
 * @param {number} options.windowMs Ventana de tiempo en milisegundos (ej: 15 * 60 * 1000 para 15 minutos)
 * @param {number} options.max Número máximo de peticiones permitidas en la ventana
 * @param {string} options.mensaje Mensaje de error personalizado en formato JSON
 */
const rateLimit = (options = {}) => {
  const windowMs = options.windowMs || 15 * 60 * 1000; // 15 mins por defecto
  const max = options.max || 100; // 100 peticiones por defecto
  const mensaje = options.mensaje || 'Demasiadas peticiones desde esta dirección IP. Por favor intenta más tarde.';
  
  // IP (String) -> Array de timestamps (number)
  const peticiones = new Map();

  // Limpieza periódica automática en memoria para evitar memory leaks
  const interval = setInterval(() => {
    const ahora = Date.now();
    for (const [ip, timestamps] of peticiones.entries()) {
      const validos = timestamps.filter(t => ahora - t < windowMs);
      if (validos.length === 0) {
        peticiones.delete(ip);
      } else {
        peticiones.set(ip, validos);
      }
    }
  }, windowMs * 2);

  // Evitar que el proceso de Node quede colgado en tests o scripts por el setInterval
  if (interval.unref) {
    interval.unref();
  }

  return (req, res, next) => {
    // Detectar IP de forma segura considerando proxies de confianza (detrás de Nginx, Cloudflare, Vercel, etc.)
    const ip = req.headers['x-forwarded-for'] 
      || req.socket.remoteAddress 
      || req.ip 
      || 'unknown_ip';

    const ahora = Date.now();

    if (!peticiones.has(ip)) {
      peticiones.set(ip, []);
    }

    const historial = peticiones.get(ip);
    
    // Filtrar peticiones que ya expiraron fuera de la ventana actual de tiempo
    const peticionesActivas = historial.filter(timestamp => ahora - timestamp < windowMs);

    if (peticionesActivas.length >= max) {
      return res.status(429).json({
        ok: false,
        message: mensaje,
        mensaje: mensaje, // Soporte para ambos nombres de clave de respuesta
        retryAfterMs: windowMs - (ahora - peticionesActivas[0]) // Tiempo restante para desbloqueo
      });
    }

    // Registrar la petición actual
    peticionesActivas.push(ahora);
    peticiones.set(ip, peticionesActivas);

    next();
  };
};

// Limitador específico para autenticación (Login, Registro, Recuperación de clave)
// Máximo 5 intentos por cada 15 minutos por dirección IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5,
  mensaje: 'Has superado el límite de intentos de acceso o solicitudes de correo. Por seguridad, tu dirección IP ha sido restringida temporalmente durante 15 minutos.'
});

module.exports = {
  rateLimit,
  authLimiter
};
