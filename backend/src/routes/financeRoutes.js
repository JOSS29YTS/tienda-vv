const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const financeController = require('../controllers/financeController');
const { verifyToken, isAdminOrManager } = require('../middleware/authMiddleware');
const { blockWriteInDemo } = require('../middleware/demoMiddleware');

router.get('/summary', verifyToken, isAdminOrManager, financeController.getFinanceSummary);
router.get('/commissions', verifyToken, isAdminOrManager, financeController.getCommissions);
router.post('/commissions/pay', verifyToken, isAdminOrManager, blockWriteInDemo, financeController.payCommission);
router.get('/transactions', verifyToken, isAdminOrManager, financeController.getRecentTransactions);
router.get('/fixed-payment-types', verifyToken, isAdminOrManager, financeController.getFixedPaymentTypes);
router.get('/payment-methods', verifyToken, isAdminOrManager, financeController.getPaymentMethods);
router.post('/fixed-payments', verifyToken, isAdminOrManager, financeController.createFixedPayment);
router.post('/transfers', verifyToken, isAdminOrManager, blockWriteInDemo, financeController.createTraspaso);
router.get('/bank/pos-summary', verifyToken, isAdminOrManager, financeController.getBankPosSummary);

// Gasos Variables
router.get('/variable-expense-types', verifyToken, isAdminOrManager, financeController.getVariableExpenseTypes);
router.post('/variable-expenses', verifyToken, isAdminOrManager, financeController.createVariableExpense);

console.log('Adding loan routes');
router.post('/loans', verifyToken, isAdminOrManager, blockWriteInDemo, financeController.createLoan);
router.get('/loans/pending', verifyToken, isAdminOrManager, financeController.getPendingLoans);
router.post('/loans/pay', verifyToken, isAdminOrManager, blockWriteInDemo, financeController.payLoan);
router.post('/buy-currency', verifyToken, isAdminOrManager, blockWriteInDemo, financeController.buyCurrency);

// Supplier Invoices
router.get('/invoices/pending', verifyToken, isAdminOrManager, invoiceController.getPendingInvoices);
router.post('/invoices/pay', verifyToken, isAdminOrManager, blockWriteInDemo, invoiceController.payInvoice);

module.exports = router;
