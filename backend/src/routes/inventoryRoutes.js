const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/', authMiddleware.verifyToken, inventoryController.getInventory);

module.exports = router;
