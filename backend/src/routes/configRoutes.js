const express = require('express');
const router = express.Router();
const configController = require('../controllers/configController');
const { verifyToken } = require('../middleware/authMiddleware');
const { blockWriteInDemo } = require('../middleware/demoMiddleware');

router.get('/rate', configController.getRate);
router.post('/rate', verifyToken, blockWriteInDemo, configController.updateRate);

module.exports = router;
