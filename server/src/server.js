// server/src/server.js
const path = require('path');
try {
  require('module').globalPaths.push(path.resolve(__dirname, '../../../server/node_modules'));
} catch (e) {}
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const authRouter        = require('../routes/auth');
const farmRouter        = require('../routes/farm');
const vetsRouter        = require('../routes/vets');
const healthRouter      = require('../routes/health');
const marketplaceRouter = require('../routes/marketplace');
const blockchainRouter  = require('../routes/blockchain');
const aiRouter          = require('../routes/ai');
const securityRouter    = require('../routes/security');

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '2mb' }));

// Rate limit auth endpoint
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false }));

// Mount routes
app.use('/api/auth',        authRouter);
app.use('/api/farm',        farmRouter);
app.use('/api/vets',        vetsRouter);
app.use('/api/health',      healthRouter);
app.use('/api/marketplace', marketplaceRouter);
app.use('/api/blockchain',  blockchainRouter);
app.use('/api/ai',          aiRouter);
app.use('/api/security',    securityRouter);

// Serve static frontend files
app.use(express.static(path.resolve(__dirname, '../../frontend')));

// Health / status checks (unauthenticated)
app.get('/api/status', (_req, res) => res.json({ ok: true, service: 'Livestock Management API Lesotho', time: new Date().toISOString() }));
app.get('/health', (_req, res) => res.json({ ok: true }));

// Fallback to index.html for single-page navigation
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.resolve(__dirname, '../../frontend/index.html'));
});

// Global error handler
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

const PORT = Number(process.env.PORT || 4001);
app.listen(PORT, () => console.log(`🐄 Livestock API → http://localhost:${PORT}`));
