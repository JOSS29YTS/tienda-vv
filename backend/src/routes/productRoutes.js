const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { verifyToken } = require('../middleware/authMiddleware');

// Categorías (público o semipúblico para selectors)
router.get('/categories', productController.getCategories);

// El resto requiere autenticación
router.get('/', verifyToken, productController.getAllProducts);
router.post('/', verifyToken, productController.createProduct);
router.put('/:id/status', verifyToken, productController.updateProductStatus);
router.put('/:id/price', verifyToken, productController.updateProductPrice);
router.put('/:id/category', verifyToken, productController.updateProductCategory);
router.delete('/:id', verifyToken, productController.deleteProduct);
router.put('/:id/barcode', verifyToken, productController.updateProductBarcode);
router.put('/:id/name', verifyToken, productController.updateProductName);
router.get('/:id/history', verifyToken, productController.getProductPriceHistory);


module.exports = router;

