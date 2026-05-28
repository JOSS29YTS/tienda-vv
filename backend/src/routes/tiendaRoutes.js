const express = require('express');
const router = express.Router();
const tiendaController = require('../controllers/tiendaController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { blockWriteInDemo } = require('../middleware/demoMiddleware');

// Todas requieren autenticación
router.get('/', authMiddleware, tiendaController.getTiendas);
router.get('/:id', authMiddleware, tiendaController.getTiendaById);
router.post('/', authMiddleware, blockWriteInDemo, tiendaController.createTienda);
router.put('/:id', authMiddleware, blockWriteInDemo, tiendaController.updateTienda);

module.exports = router;
