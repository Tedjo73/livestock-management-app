const express = require('express');
const { User, Listing } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// All admin routes require authentication + admin role
router.use(authenticate, authorize('admin'));

/**
 * GET /api/admin/users
 * List all users
 */
router.get('/users', async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password_hash'] },
      order: [['created_at', 'DESC']],
    });
    return res.json({ users });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch users.' });
  }
});

/**
 * PATCH /api/admin/users/:id/role
 * Change user role
 */
router.patch('/users/:id/role', async (req, res) => {
  try {
    const { role } = req.body;
    if (!['farmer', 'buyer', 'advisor', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role.' });
    }
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    await user.update({ role });
    return res.json({ message: 'Role updated.', user });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update role.' });
  }
});

/**
 * PATCH /api/admin/users/:id/status
 * Enable or disable a user account
 */
router.patch('/users/:id/status', async (req, res) => {
  try {
    const { is_active } = req.body;
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    await user.update({ is_active });
    return res.json({ message: `Account ${is_active ? 'enabled' : 'disabled'}.`, user });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update status.' });
  }
});

/**
 * DELETE /api/admin/users/:id
 * Delete a user (GDPR right to erasure)
 */
router.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    // Anonymize instead of hard delete for data integrity
    await user.update({
      name: 'Deleted User',
      email: `deleted_${user.id}@anonymised.local`,
      phone: null,
      location: null,
      is_active: false,
    });
    return res.json({ message: 'User data anonymised (GDPR right to erasure).' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete user.' });
  }
});

/**
 * GET /api/admin/stats
 * Dashboard stats
 */
router.get('/stats', async (req, res) => {
  try {
    const [totalUsers, totalListings, activeListings] = await Promise.all([
      User.count(),
      Listing.count(),
      Listing.count({ where: { status: 'active' } }),
    ]);
    return res.json({ totalUsers, totalListings, activeListings });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to get stats.' });
  }
});

// In-memory configurable dynamic permissions state (persisted per server lifecycle)
let dynamicRbacPolicy = {
  farmer: {
    listings: { read: true, write: true, delete: false },
    messages: { read: true, write: true, delete: false },
    prices: { read: true, write: false, delete: false },
    tips: { read: true, write: false, delete: false },
    ai: { read: true, write: true, delete: false },
    blockchain: { read: true, write: false, delete: false },
  },
  buyer: {
    listings: { read: true, write: false, delete: false },
    messages: { read: true, write: true, delete: false },
    prices: { read: true, write: false, delete: false },
    tips: { read: true, write: false, delete: false },
    ai: { read: true, write: true, delete: false },
    blockchain: { read: true, write: false, delete: false },
  },
  advisor: {
    listings: { read: true, write: false, delete: false },
    messages: { read: true, write: true, delete: false },
    prices: { read: true, write: false, delete: false },
    tips: { read: true, write: true, delete: false },
    ai: { read: true, write: true, delete: false },
    blockchain: { read: true, write: false, delete: false },
  },
  admin: {
    listings: { read: true, write: true, delete: true },
    messages: { read: true, write: true, delete: true },
    prices: { read: true, write: true, delete: true },
    tips: { read: true, write: true, delete: true },
    ai: { read: true, write: true, delete: true },
    blockchain: { read: true, write: true, delete: true },
  },
};

/**
 * GET /api/admin/security
 * Security configuration overview & dynamic permissions
 */
router.get('/security', async (req, res) => {
  return res.json({
    securityConfig: {
      dataClassification: {
        public: ['crop_name', 'price_per_unit', 'location', 'quantity', 'farming_tips'],
        private: ['user_name', 'phone', 'email', 'profile_image'],
        confidential: ['messages', 'transaction_history', 'sales_volume'],
        restricted: ['password_hash', 'jwt_secret', 'admin_records', 'blockchain_keys'],
      },
      rbacPolicy: {
        farmer: { listings: 'read/write-own', messages: 'read/write', tips: 'read', prices: 'read' },
        buyer: { listings: 'read-only', messages: 'read/write', tips: 'read', prices: 'read' },
        advisor: { listings: 'read', messages: 'read/write', tips: 'read/write', prices: 'read' },
        admin: { listings: 'full', messages: 'full', tips: 'full', prices: 'full', users: 'full' },
      },
      dynamicPermissions: dynamicRbacPolicy,
      gdprMeasures: [
        'Explicit consent collected at user registration',
        'Right to erasure implemented via soft-anonymization',
        'Cryptographic password hashing (bcrypt cost factor 12)',
        'Signed JSON Web Tokens with 24-hour expiration',
        'Data minimisation principles across all forms',
        'Zero third-party data distribution or monetization',
      ],
      securityDomain: 'security.agriconnect.ls',
      securityRealm: 'ISOLATED_SECURITY_ADMINISTRATION_ZONE',
    },
  });
});

/**
 * PUT /api/admin/security/permissions
 * Update and persist read/write permissions for an actor on a module
 */
router.put('/security/permissions', async (req, res) => {
  try {
    const { role, module: moduleName, action, value } = req.body;
    if (!dynamicRbacPolicy[role]) {
      return res.status(400).json({ error: `Invalid role: ${role}` });
    }
    if (!dynamicRbacPolicy[role][moduleName]) {
      return res.status(400).json({ error: `Invalid module: ${moduleName}` });
    }
    if (!['read', 'write', 'delete'].includes(action)) {
      return res.status(400).json({ error: `Invalid action: ${action}` });
    }

    dynamicRbacPolicy[role][moduleName][action] = Boolean(value);

    return res.json({
      message: `Permission updated successfully: [${role} -> ${moduleName} -> ${action} = ${value}]`,
      dynamicPermissions: dynamicRbacPolicy,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update security permissions.' });
  }
});

module.exports = router;
