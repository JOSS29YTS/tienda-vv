const express = require('express');
const router = express.Router();
const tiendaController = require('../controllers/tiendaController');
const { authMiddleware } = require('../middleware/authMiddleware');

// Todas requieren autenticación
router.get('/', authMiddleware, tiendaController.getTiendas);
router.get('/:id', authMiddleware, tiendaController.getTiendaById);
router.post('/', authMiddleware, tiendaController.createTienda);
router.put('/:id', authMiddleware, tiendaController.updateTienda);

module.exports = router;
