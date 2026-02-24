const express = require('express');
const router = express.Router();
const { getProfitLoss } = require('../controllers/profitLossController');
const { verifyToken, isAdminOrManager } = require('../middleware/authMiddleware');

router.get('/', verifyToken, isAdminOrManager, getProfitLoss);

module.exports = router;
