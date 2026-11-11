const express = require('express');
const {
  getLedgerBlocks,
  getBlockchainStats,
  verifyListingIntegrity,
} = require('../services/blockchainService');
const { BlockchainBlock } = require('../models');

const router = express.Router();

/**
 * GET /api/blockchain/stats
 * Network telemetry & block metrics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await getBlockchainStats();
    return res.json({ success: true, stats });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch blockchain network telemetry.' });
  }
});

/**
 * GET /api/blockchain/ledger
 * Paginated blocks from PostgreSQL blockchain_ledger table
 */
router.get('/ledger', async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const data = await getLedgerBlocks(limit, page);
    return res.json({ success: true, ...data });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch blockchain ledger blocks.' });
  }
});

/**
 * GET /api/blockchain/verify/:id
 * Verifies cryptographic integrity of a listing
 */
router.get('/verify/:id', async (req, res) => {
  try {
    const verification = await verifyListingIntegrity(req.params.id);
    return res.json(verification);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to verify cryptographic integrity.' });
  }
});

/**
 * GET /api/blockchain/tx/:txHash
 * Retrieve block by transaction hash
 */
router.get('/tx/:txHash', async (req, res) => {
  try {
    const block = await BlockchainBlock.findOne({
      where: { transaction_hash: req.params.txHash },
      raw: true,
    });
    if (!block) return res.status(404).json({ error: 'Transaction hash not found on blockchain.' });
    return res.json({ success: true, block });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch transaction details.' });
  }
});

module.exports = router;

