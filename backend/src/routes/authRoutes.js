const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { authLimiter } = require('../middleware/rateLimiter');
const authController = require('../controllers/authController');

// POST /api/auth/login -> Iniciar sesión
router.post(
  '/login',
  authLimiter,
  [
    body('email').isEmail().withMessage('Por favor ingrese un correo electrónico válido.'),
    body('password').notEmpty().withMessage('La contraseña es requerida.')
  ],
  authController.login
);

// POST /api/auth/register-init -> Iniciar solicitud de registro (envío de código por correo)
router.post(
  '/register-init',
  authLimiter,
  [
    body('nombre').notEmpty().withMessage('El nombre es requerido.'),
    body('apellido').notEmpty().withMessage('El apellido es requerido.'),
    body('email').isEmail().withMessage('Por favor ingrese un correo electrónico válido.'),
    body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres.')
  ],
  authController.registerInit
);

// POST /api/auth/register-verify -> Completar registro (verificar código de 6 dígitos)
router.post(
  '/register-verify',
  authLimiter,
  [
    body('codigo').isLength({ min: 6, max: 6 }).withMessage('El código de verificación debe ser de 6 dígitos.'),
    body('tempToken').notEmpty().withMessage('El token temporal es requerido.')
  ],
  authController.registerComplete
);

// POST /api/auth/forgot-password -> Solicitar recuperación de contraseña (código por correo)
router.post(
  '/forgot-password',
  authLimiter,
  [
    body('email').isEmail().withMessage('Por favor ingrese un correo electrónico válido.')
  ],
  authController.forgotPassword
);

// POST /api/auth/reset-password -> Restablecer contraseña con código verificado
router.post(
  '/reset-password',
  authLimiter,
  [
    body('email').isEmail().withMessage('Por favor ingrese un correo electrónico válido.'),
    body('code').isLength({ min: 6, max: 6 }).withMessage('El código de verificación debe ser de 6 dígitos.'),
    body('newPassword').isLength({ min: 6 }).withMessage('La nueva contraseña debe tener al menos 6 caracteres.'),
    body('recoveryToken').notEmpty().withMessage('El token de recuperación es requerido.')
  ],
  authController.resetPassword
);

module.exports = router;
