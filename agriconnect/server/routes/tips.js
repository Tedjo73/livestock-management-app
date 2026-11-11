const express = require('express');
const { getTips, getTipById, createTip, deleteTip } = require('../controllers/tipsController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Public
router.get('/', getTips);
router.get('/:id', getTipById);

// Advisor or admin can create
router.post('/', authenticate, authorize('advisor', 'admin'), createTip);

// Admin only can delete
router.delete('/:id', authenticate, authorize('admin'), deleteTip);

module.exports = router;
