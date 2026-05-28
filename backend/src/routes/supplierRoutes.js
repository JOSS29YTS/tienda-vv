const express = require('express');
const router = express.Router();
const supplierController = require('../controllers/supplierController');
const { verifyToken, isAdminOrManager } = require('../middleware/authMiddleware');
const { blockWriteInDemo } = require('../middleware/demoMiddleware');

router.get('/', verifyToken, isAdminOrManager, supplierController.getProviders);
router.post('/', verifyToken, isAdminOrManager, blockWriteInDemo, supplierController.createProvider);

module.exports = router;
