const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const { User } = require('../models');

/**
 * POST /api/auth/register
 */
const register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array(), error: errors.array()[0]?.msg || 'Validation failed.' });
  }

  const { name, email, password, role, phone, location } = req.body;
  const cleanEmail = (email || '').toLowerCase().trim();

  try {
    // Check if user already exists (case-insensitive in PostgreSQL)
    const existingUser = await User.findOne({ where: { email: cleanEmail } });
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const password_hash = await bcrypt.hash(password, salt);

    // Create user (prevent self-assigned admin role)
    const safeRole = role === 'admin' ? 'farmer' : (role || 'farmer');

    const user = await User.create({
      name: (name || '').trim(),
      email: cleanEmail,
      password_hash,
      role: safeRole,
      phone: phone || null,
      location: location || null,
      is_active: true,
    });

    console.log(`👤 New user registered in PostgreSQL: ${user.email} (ID: ${user.id}, Role: ${user.role})`);

    // Generate token
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET || 'agriconnect_jwt_secret_key_2025',
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    return res.status(201).json({
      message: 'Registration successful.',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        location: user.location,
      },
    });
  } catch (err) {
    console.error('Register error details:', err);
    if (err.name === 'SequelizeConnectionError' || err.name === 'SequelizeConnectionRefusedError' || err.message?.includes('connect')) {
      return res.status(503).json({
        error: 'Database connection failed: Cannot reach PostgreSQL on port 5432. Please make sure PostgreSQL service is running.',
      });
    }
    return res.status(500).json({ error: err.message || 'Server error during registration.' });
  }
};

/**
 * POST /api/auth/login
 */
const login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array(), error: errors.array()[0]?.msg || 'Validation failed.' });
  }

  const { email, password } = req.body;
  const cleanEmail = (email || '').toLowerCase().trim();

  try {
    const user = await User.findOne({ where: { email: cleanEmail } });

    if (!user) {
      return res.status(401).json({ error: 'No user found with this email address.' });
    }

    if (user.is_active === false) {
      return res.status(403).json({ error: 'This account has been disabled. Please contact administrator.' });
    }

    // Compare with bcrypt
    let isMatch = false;
    try {
      isMatch = await bcrypt.compare(password, user.password_hash);
    } catch (e) {
      isMatch = false;
    }

    // Plaintext fallback support if seeded manually
    if (!isMatch && user.password_hash === password) {
      isMatch = true;
      const salt = await bcrypt.genSalt(12);
      user.password_hash = await bcrypt.hash(password, salt);
      await user.save();
    }

    if (!isMatch) {
      return res.status(401).json({ error: 'Incorrect password.' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET || 'agriconnect_jwt_secret_key_2025',
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    console.log(`🔓 User logged in: ${user.email} (${user.role})`);

    return res.json({
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        location: user.location,
      },
    });
  } catch (err) {
    console.error('Login error details:', err);
    if (err.name === 'SequelizeConnectionError' || err.name === 'SequelizeConnectionRefusedError' || err.message?.includes('connect')) {
      return res.status(503).json({
        error: 'Database connection failed: Cannot reach PostgreSQL on port 5432.',
      });
    }
    return res.status(500).json({ error: err.message || 'Server error during login.' });
  }
};

/**
 * GET /api/auth/me
 */
const getMe = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password_hash'] },
    });
    if (!user) return res.status(404).json({ error: 'User not found.' });
    return res.json({ user });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch user data.' });
  }
};

module.exports = { register, login, getMe };
