const express = require('express');
const router = express.Router();
const { getUsers, getUser, updateUser, deleteUser, getDistributors, getSalesReps } = require('../controllers/user.controller');
const { protect, authorize } = require('../middleware/auth.middleware');
const { mongoIdValidation } = require('../middleware/validation.middleware');

router.use(protect);

router.get('/distributors', authorize('admin', 'distributor', 'sales_rep'), getDistributors);
router.get('/sales-reps', authorize('admin', 'distributor'), getSalesReps);

router.route('/')
  .get(authorize('admin'), getUsers);

router.route('/:id')
  .get(authorize('admin'), mongoIdValidation, getUser)
  .put(authorize('admin'), mongoIdValidation, updateUser)
  .delete(authorize('admin'), mongoIdValidation, deleteUser);

module.exports = router;
