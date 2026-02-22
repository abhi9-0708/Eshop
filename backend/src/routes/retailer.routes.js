const express = require('express');
const router = express.Router();
const { getRetailers, getRetailer, createRetailer, updateRetailer, deleteRetailer } = require('../controllers/retailer.controller');
const { protect, authorize } = require('../middleware/auth.middleware');
const { retailerValidation, mongoIdValidation, paginationValidation } = require('../middleware/validation.middleware');

router.use(protect);

router.route('/')
  .get(paginationValidation, getRetailers)
  .post(authorize('admin', 'distributor', 'sales_rep'), retailerValidation, createRetailer);

router.route('/:id')
  .get(mongoIdValidation, getRetailer)
  .put(authorize('admin', 'distributor', 'sales_rep'), mongoIdValidation, updateRetailer)
  .delete(authorize('admin', 'distributor'), mongoIdValidation, deleteRetailer);

module.exports = router;
