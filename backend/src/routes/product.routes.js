const express = require('express');
const router = express.Router();
const {
  getProducts, getProduct, createProduct, updateProduct,
  deleteProduct, getCategories, updateStock
} = require('../controllers/product.controller');
const { protect, authorize } = require('../middleware/auth.middleware');
const { productValidation, mongoIdValidation, paginationValidation } = require('../middleware/validation.middleware');

router.use(protect);

router.get('/categories', getCategories);

router.route('/')
  .get(paginationValidation, getProducts)
  .post(authorize('admin', 'distributor'), productValidation, createProduct);

router.route('/:id')
  .get(mongoIdValidation, getProduct)
  .put(authorize('admin', 'distributor'), mongoIdValidation, updateProduct)
  .delete(authorize('admin'), mongoIdValidation, deleteProduct);

router.put('/:id/stock', authorize('admin', 'distributor'), mongoIdValidation, updateStock);

module.exports = router;
