const express = require('express');
const router = express.Router();
const salesController = require('../controllers/salesController');

const authMiddleware = require('../middleware/authMiddleware');

router.get('/payment-methods', salesController.getPaymentMethods);
router.post('/close', authMiddleware.verifyToken, salesController.closeSales);

module.exports = router;
