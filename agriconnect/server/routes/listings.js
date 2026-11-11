const express = require('express');
const { body } = require('express-validator');
const {
  getListings,
  getListingById,
  createListing,
  updateListing,
  deleteListing,
  getUserListings,
} = require('../controllers/listingsController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.get('/', getListings);
router.get('/user/:userId', getUserListings);
router.get('/:id', getListingById);

// Protected routes
router.post(
  '/',
  authenticate,
  [
    body('crop_name').notEmpty().withMessage('Crop name is required'),
    body('category').isIn(['grains', 'vegetables', 'fruits', 'legumes', 'livestock', 'other']).withMessage('Invalid category'),
    body('quantity').isFloat({ min: 0.01 }).withMessage('Quantity must be positive'),
    body('price_per_unit').isFloat({ min: 0 }).withMessage('Price must be non-negative'),
    body('location').notEmpty().withMessage('Location is required'),
  ],
  createListing
);

router.put('/:id', authenticate, updateListing);
router.delete('/:id', authenticate, deleteListing);

module.exports = router;
