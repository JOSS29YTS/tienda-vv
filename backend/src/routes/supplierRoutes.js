const express = require('express');
const router = express.Router();
const supplierController = require('../controllers/supplierController');
const { verifyToken, isAdminOrManager } = require('../middleware/authMiddleware');

router.get('/', verifyToken, isAdminOrManager, supplierController.getProviders);
router.post('/', verifyToken, isAdminOrManager, supplierController.createProvider);

module.exports = router;
