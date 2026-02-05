const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/login', authController.login);
router.post('/register-init', authController.registerInit);
router.post('/register-verify', authController.registerComplete);

module.exports = router;
