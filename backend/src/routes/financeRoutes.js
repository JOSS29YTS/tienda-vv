const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const financeController = require('../controllers/financeController');
const { verifyToken, isAdminOrManager } = require('../middleware/authMiddleware');

router.get('/summary', verifyToken, isAdminOrManager, financeController.getFinanceSummary);
router.get('/commissions', verifyToken, isAdminOrManager, financeController.getCommissions);
router.get('/transactions', verifyToken, isAdminOrManager, financeController.getRecentTransactions);
router.get('/fixed-payment-types', verifyToken, isAdminOrManager, financeController.getFixedPaymentTypes);
router.get('/payment-methods', verifyToken, isAdminOrManager, financeController.getPaymentMethods);
router.post('/fixed-payments', verifyToken, isAdminOrManager, financeController.createFixedPayment);
router.post('/transfers', verifyToken, isAdminOrManager, financeController.createTraspaso);

// Gasos Variables
router.get('/variable-expense-types', verifyToken, isAdminOrManager, financeController.getVariableExpenseTypes);
router.post('/variable-expenses', verifyToken, isAdminOrManager, financeController.createVariableExpense);

console.log('Adding loan routes');
router.post('/loans', verifyToken, isAdminOrManager, financeController.createLoan);
router.get('/loans/pending', verifyToken, isAdminOrManager, financeController.getPendingLoans);
router.post('/loans/pay', verifyToken, isAdminOrManager, financeController.payLoan);
router.post('/buy-currency', verifyToken, isAdminOrManager, financeController.buyCurrency);

// Supplier Invoices
router.get('/invoices/pending', verifyToken, isAdminOrManager, invoiceController.getPendingInvoices);
router.post('/invoices/pay', verifyToken, isAdminOrManager, invoiceController.payInvoice);

module.exports = router;
