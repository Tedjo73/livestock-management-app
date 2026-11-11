const express = require('express');
const { getPrices, addPrice, getWeather } = require('../controllers/pricesController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.get('/', getPrices);
router.get('/weather/:district', getWeather);

// Admin only - add price records
router.post('/', authenticate, authorize('admin'), addPrice);

module.exports = router;
