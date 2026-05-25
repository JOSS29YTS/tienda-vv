const express = require('express');
const router = express.Router();
const backupController = require('../controllers/backupController');
const authMiddleware = require('../middleware/authMiddleware');

// Endpoint protegido para generar y descargar el backup HTML offline
router.get('/generate-html', authMiddleware.verifyToken, backupController.generateHTMLBackup);

module.exports = router;
