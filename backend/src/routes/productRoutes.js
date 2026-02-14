const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

router.get('/categories', productController.getCategories);
router.get('/', productController.getAllProducts);
router.post('/', productController.createProduct);
router.put('/:id/status', productController.updateProductStatus);
router.put('/:id/price', productController.updateProductPrice);
router.put('/:id/category', productController.updateProductCategory);
router.delete('/:id', productController.deleteProduct);
router.put('/:id/barcode', productController.updateProductBarcode);

module.exports = router;
