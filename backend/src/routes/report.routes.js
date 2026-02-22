const express = require('express');
const router = express.Router();
const { getSalesReport, getPerformanceReport } = require('../controllers/report.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

router.use(protect);

router.get('/sales', getSalesReport);
router.get('/performance', authorize('admin', 'distributor'), getPerformanceReport);

module.exports = router;
