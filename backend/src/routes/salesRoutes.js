const express = require('express');
const router = express.Router();
const salesController = require('../controllers/salesController');

const authMiddleware = require('../middleware/authMiddleware');

router.get('/payment-methods', salesController.getPaymentMethods);
router.post('/close', authMiddleware.verifyToken, authMiddleware.isAdmin, salesController.closeSales);

// Draft sales endpoints for real-time sync
router.post('/draft', authMiddleware.verifyToken, salesController.saveDraftSales);
router.get('/draft', authMiddleware.verifyToken, salesController.getDraftSales);

module.exports = router;
