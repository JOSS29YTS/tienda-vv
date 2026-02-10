const express = require('express');
const router = express.Router();
const financeController = require('../controllers/financeController');
const { verifyToken, isAdminOrManager } = require('../middleware/authMiddleware');


router.get('/summary', verifyToken, isAdminOrManager, financeController.getFinanceSummary);
router.get('/transactions', verifyToken, isAdminOrManager, financeController.getRecentTransactions);
router.get('/fixed-payment-types', verifyToken, isAdminOrManager, financeController.getFixedPaymentTypes);
router.get('/payment-methods', verifyToken, isAdminOrManager, financeController.getPaymentMethods);
router.post('/fixed-payments', verifyToken, isAdminOrManager, financeController.createFixedPayment);
router.post('/transfers', verifyToken, isAdminOrManager, financeController.createTraspaso);

module.exports = router;
