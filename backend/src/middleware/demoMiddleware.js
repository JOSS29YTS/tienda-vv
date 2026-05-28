const { isDemoMode, getDemoEmail } = require('../config/demoMode')

const MENSAJE_BLOQUEO = 'Esta función no está disponible en el modo demostración del portafolio.'
const MENSAJE_SOLO_DEMO = 'En modo demostración solo está disponible la cuenta demo.'

function blockIfDemoMode(req, res, next) {
  if (isDemoMode()) {
    return res.status(403).json({ ok: false, mensaje: MENSAJE_BLOQUEO })
  }
  next()
}

function restrictLoginToDemo(req, res, next) {
  if (!isDemoMode()) return next()
  const email = (req.body.email || '').trim().toLowerCase()
  if (email !== getDemoEmail()) {
    return res.status(403).json({ ok: false, mensaje: MENSAJE_SOLO_DEMO })
  }
  next()
}

function blockWriteInDemo(req, res, next) {
  if (isDemoMode()) {
    return res.status(403).json({ ok: false, mensaje: 'Función no disponible en modo demostración.' })
  }
  next()
}

module.exports = { blockIfDemoMode, restrictLoginToDemo, blockWriteInDemo }
