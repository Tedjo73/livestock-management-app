const { validationResult } = require('express-validator');
const { Op } = require('sequelize');
const { Listing, User } = require('../models');
const { recordListingOnBlockchain, verifyListingIntegrity } = require('../services/blockchainService');

/**
 * GET /api/listings
 * Public - browse all active listings with search/filter
 */
const getListings = async (req, res) => {
  try {
    const { search, category, location, minPrice, maxPrice, page = 1, limit = 12 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const where = { status: 'active' };

    if (search) {
      where[Op.or] = [
        { crop_name: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
      ];
    }
    if (category) where.category = category;
    if (location) where.location = { [Op.like]: `%${location}%` };
    if (minPrice) where.price_per_unit = { ...where.price_per_unit, [Op.gte]: parseFloat(minPrice) };
    if (maxPrice) where.price_per_unit = { ...where.price_per_unit, [Op.lte]: parseFloat(maxPrice) };

    const { count, rows } = await Listing.findAndCountAll({
      where,
      include: [{ model: User, as: 'seller', attributes: ['id', 'name', 'location', 'phone'] }],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset,
    });

    return res.json({
      listings: rows,
      total: count,
      page: parseInt(page),
      totalPages: Math.ceil(count / parseInt(limit)),
    });
  } catch (err) {
    console.error('Get listings error:', err);
    return res.status(500).json({ error: 'Failed to fetch listings.' });
  }
};

/**
 * GET /api/listings/:id
 * Public - get single listing detail
 */
const getListingById = async (req, res) => {
  try {
    const listing = await Listing.findByPk(req.params.id, {
      include: [{ model: User, as: 'seller', attributes: ['id', 'name', 'location', 'phone', 'email'] }],
    });

    if (!listing) return res.status(404).json({ error: 'Listing not found.' });

    // Increment view count
    await listing.increment('views');

    return res.json({ listing });
  } catch (err) {
    console.error('Get listing error:', err);
    return res.status(500).json({ error: 'Failed to fetch listing.' });
  }
};

/**
 * POST /api/listings
 * Auth required
 */
const createListing = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { crop_name, category, quantity, unit, price_per_unit, description, location, image_url } = req.body;

  try {
    const listing = await Listing.create({
      user_id: req.user.id,
      crop_name,
      category,
      quantity,
      unit: unit || 'kg',
      price_per_unit,
      description,
      location: location || req.user.location,
      image_url,
    });

    // Record on blockchain (Part B: Distributed processing, transparency, and integrity)
    recordListingOnBlockchain({
      id: listing.id,
      crop_name: listing.crop_name,
      category: listing.category,
      quantity: listing.quantity,
      price_per_unit: listing.price_per_unit,
      location: listing.location,
      user_id: req.user.id,
    })
      .then((receipt) => {
        if (receipt?.transactionHash) {
          listing.update({ blockchain_tx_hash: receipt.transactionHash });
          console.log(`🔗 Listing #${listing.id} secured on blockchain ledger: ${receipt.transactionHash}`);
        }
      })
      .catch((err) => console.warn('Blockchain record notice:', err.message));

    return res.status(201).json({ message: 'Listing created successfully.', listing });
  } catch (err) {
    console.error('Create listing error:', err);
    return res.status(500).json({ error: 'Failed to create listing.' });
  }
};

/**
 * PUT /api/listings/:id
 * Auth required - only owner or admin
 */
const updateListing = async (req, res) => {
  try {
    const listing = await Listing.findByPk(req.params.id);
    if (!listing) return res.status(404).json({ error: 'Listing not found.' });

    if (listing.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to update this listing.' });
    }

    const allowedFields = ['crop_name', 'category', 'quantity', 'unit', 'price_per_unit', 'description', 'location', 'status', 'image_url'];
    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    await listing.update(updates);
    return res.json({ message: 'Listing updated.', listing });
  } catch (err) {
    console.error('Update listing error:', err);
    return res.status(500).json({ error: 'Failed to update listing.' });
  }
};

/**
 * DELETE /api/listings/:id
 * Auth required - only owner or admin
 */
const deleteListing = async (req, res) => {
  try {
    const listing = await Listing.findByPk(req.params.id);
    if (!listing) return res.status(404).json({ error: 'Listing not found.' });

    if (listing.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to delete this listing.' });
    }

    await listing.destroy();
    return res.json({ message: 'Listing deleted.' });
  } catch (err) {
    console.error('Delete listing error:', err);
    return res.status(500).json({ error: 'Failed to delete listing.' });
  }
};

/**
 * GET /api/listings/user/:userId
 * Get all listings by a specific user
 */
const getUserListings = async (req, res) => {
  try {
    const listings = await Listing.findAll({
      where: { user_id: req.params.userId },
      order: [['created_at', 'DESC']],
    });
    return res.json({ listings });
  } catch (err) {
    console.error('Get user listings error:', err);
    return res.status(500).json({ error: 'Failed to fetch user listings.' });
  }
};

// --- Internal helper ---
const recordOnBlockchain = async (listingId, cropName, price, sellerId) => {
  try {
    const { ethers } = require('ethers');
    if (!process.env.BLOCKCHAIN_RPC_URL || !process.env.CONTRACT_ADDRESS || process.env.CONTRACT_ADDRESS === '0x0000000000000000000000000000000000000000') {
      return null; // Blockchain not configured
    }
    const provider = new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL);
    const wallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);
    const abi = require('../config/AgriConnectABI.json');
    const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, abi, wallet);
    const tx = await contract.recordListing(listingId, cropName, ethers.parseEther(price.toString()), sellerId);
    await tx.wait();
    return tx.hash;
  } catch (err) {
    return null;
  }
};

module.exports = { getListings, getListingById, createListing, updateListing, deleteListing, getUserListings };
