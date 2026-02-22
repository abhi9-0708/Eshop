const express = require('express');
const router = express.Router();
const {
  getOrders, getOrder, createOrder, updateOrderStatus, updatePaymentStatus
} = require('../controllers/order.controller');
const { protect, authorize } = require('../middleware/auth.middleware');
const { orderValidation, mongoIdValidation, paginationValidation } = require('../middleware/validation.middleware');

router.use(protect);

router.route('/')
  .get(paginationValidation, getOrders)
  .post(authorize('admin', 'distributor', 'sales_rep'), orderValidation, createOrder);

router.route('/:id')
  .get(mongoIdValidation, getOrder);

router.put('/:id/status', authorize('admin', 'distributor', 'sales_rep'), mongoIdValidation, updateOrderStatus);
router.put('/:id/payment', authorize('admin', 'distributor'), mongoIdValidation, updatePaymentStatus);

module.exports = router;
