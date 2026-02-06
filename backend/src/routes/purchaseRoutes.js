const express = require('express');
const router = express.Router();
const purchaseController = require('../controllers/purchaseController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/', authMiddleware.verifyToken, purchaseController.createPurchase);

module.exports = router;
