const express = require('express');
const router = express.Router();
const clientController = require('../controllers/clientController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/', authMiddleware.verifyToken, clientController.getAllClients);
router.get('/debtors', authMiddleware.verifyToken, clientController.getDebtors);
router.post('/pay', authMiddleware.verifyToken, clientController.payDebt);
router.get('/:id/history', authMiddleware.verifyToken, clientController.getPaymentHistory);
router.get('/:id/purchases', authMiddleware.verifyToken, clientController.getPurchases);

module.exports = router;
