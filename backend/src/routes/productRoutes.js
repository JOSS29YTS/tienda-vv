const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

router.get('/', productController.getAllProducts);
router.post('/', productController.createProduct);
router.put('/:id/status', productController.updateProductStatus);
router.put('/:id/price', productController.updateProductPrice);
router.delete('/:id', productController.deleteProduct);

module.exports = router;
