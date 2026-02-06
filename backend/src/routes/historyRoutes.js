const express = require('express');
const router = express.Router();
const historyController = require('../controllers/historyController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/', authMiddleware.verifyToken, historyController.getHistory);

module.exports = router;
