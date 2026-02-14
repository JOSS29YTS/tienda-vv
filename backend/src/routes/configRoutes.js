const express = require('express');
const router = express.Router();
const configController = require('../controllers/configController');

router.get('/rate', configController.getRate);
router.post('/rate', configController.updateRate);

module.exports = router;
