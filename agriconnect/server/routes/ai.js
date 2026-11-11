const express = require('express');
const {
  getOverview,
  predictSales,
  getMarketTrends,
  getAccuracyAndSaturation,
  getCropRecommendations,
  getDatasetSample,
} = require('../controllers/aiController');

const router = express.Router();

// Public routes for AI & analytics
router.get('/overview', getOverview);
router.post('/predict-sales', predictSales);
router.get('/market-trends', getMarketTrends);
router.get('/accuracy-saturation', getAccuracyAndSaturation);
router.get('/crop-recommendations', getCropRecommendations);
router.get('/dataset-sample', getDatasetSample);

module.exports = router;

