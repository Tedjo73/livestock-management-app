const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const sequelize = require('./config/database');
require('./models'); // Initialize associations

// Routes
const authRoutes = require('./routes/auth');
const listingsRoutes = require('./routes/listings');
const messagesRoutes = require('./routes/messages');
const pricesRoutes = require('./routes/prices');
const tipsRoutes = require('./routes/tips');
const adminRoutes = require('./routes/admin');
const aiRoutes = require('./routes/ai');
const blockchainRoutes = require('./routes/blockchain');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Security Middleware ─────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
})); // Sets secure HTTP headers
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [
      process.env.FRONTEND_URL,
      // Allow same-origin requests (when frontend served from same Render service)
      /\.onrender\.com$/,
      /\.vercel\.app$/,
      /\.netlify\.app$/,
    ].filter(Boolean)
  : true; // Allow all in development

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2000,
  message: { error: 'Too many requests. Please try again later.' },
});
app.use(limiter);

// Auth limiter
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 10 : 1000,
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
});

// ─── General Middleware ──────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/listings', listingsRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/prices', pricesRoutes);
app.use('/api/tips', tipsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/blockchain', blockchainRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: '1.0.0',
    app: 'AgriConnect API',
  });
});

// ─── Serve React Frontend Statically (Runs on Port 5000) ──────────────────────
const buildPath = path.join(__dirname, '..', 'build');
if (fs.existsSync(buildPath)) {
  console.log(`📦 Serving React frontend from: ${buildPath}`);
  app.use(express.static(buildPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/health')) {
      return next();
    }
    res.sendFile(path.join(buildPath, 'index.html'));
  });
}

// 404 handler for unmatched API routes
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found.` });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error.' });
});

// ─── Database & Server Start ──────────────────────────────────────────────────
const start = async () => {
  try {
    await sequelize.authenticate();
    console.log(`✅ PostgreSQL database connected (${sequelize.getDialect()}).`);

    // Sync models (alter: true updates schema without dropping tables)
    await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
    console.log('✅ PostgreSQL database tables synchronized.');

    // Seed initial data in development
    if (process.env.NODE_ENV === 'development') {
      const seedPostgres = require('./seeders/seedPostgres');
      await seedPostgres().catch(err => console.warn('Seeder warning:', err.message));
    }
  } catch (err) {
    console.warn('\n⚠️  WARNING: Could not connect to PostgreSQL on port 5432:');
    console.warn(`   ${err.message || 'Connection refused on localhost:5432'}`);
    console.warn('👉 To resolve this:');
    console.warn('   1. Ensure PostgreSQL service is started: Run "net start postgresql-x64-18" or open services.msc and start "postgresql-x64-18".');
    console.warn('   2. Ensure the database "agriconnect" is created in PostgreSQL.');
    console.warn('   3. Verify DB_PASSWORD in server/.env matches your PostgreSQL superuser password.\n');
  }

  app.listen(PORT, () => {
    console.log(`🌿 AgriConnect API running on http://localhost:${PORT}`);
    console.log(`   Environment: ${process.env.NODE_ENV}`);
    console.log(`   Database Engine: PostgreSQL (Port ${process.env.DB_PORT || 5432})`);
    console.log(`   Health check: http://localhost:${PORT}/health`);
  });
};

// ─── Database Seeder ─────────────────────────────────────────────────────────
const seedDatabase = async () => {
  const bcrypt = require('bcryptjs');
  const { User, Listing, CropPrice, FarmingTip } = require('./models');

  const existingAdmin = await User.findOne({ where: { email: 'admin@agriconnect.ls' } });
  if (existingAdmin) return; // Already seeded

  console.log('🌱 Seeding initial data...');

  const adminHash = await bcrypt.hash('Admin@1234', 12);
  const farmerHash = await bcrypt.hash('Farmer@1234', 12);
  const advisorHash = await bcrypt.hash('Advisor@1234', 12);

  const admin = await User.create({ name: 'System Admin', email: 'admin@agriconnect.ls', password_hash: adminHash, role: 'admin', location: 'Maseru' });
  const farmer1 = await User.create({ name: 'Thabo Mokoena', email: 'thabo@agriconnect.ls', password_hash: farmerHash, role: 'farmer', phone: '+266 5812 3456', location: 'Berea' });
  const farmer2 = await User.create({ name: 'Lineo Ntšo', email: 'lineo@agriconnect.ls', password_hash: farmerHash, role: 'farmer', phone: '+266 5823 4567', location: 'Leribe' });
  const advisor = await User.create({ name: 'Dr. Mphato Letsie', email: 'mphato@agriconnect.ls', password_hash: advisorHash, role: 'advisor', phone: '+266 5867 8901', location: 'Maseru' });

  // Sample listings
  await Listing.bulkCreate([
    { user_id: farmer1.id, crop_name: 'Maize', category: 'grains', quantity: 500, unit: 'kg', price_per_unit: 6.50, description: 'Fresh maize, this season harvest.', location: 'Berea', status: 'active' },
    { user_id: farmer1.id, crop_name: 'Sorghum', category: 'grains', quantity: 200, unit: 'kg', price_per_unit: 7.00, description: 'Organic sorghum, Lesotho highlands.', location: 'Berea', status: 'active' },
    { user_id: farmer2.id, crop_name: 'Tomatoes', category: 'vegetables', quantity: 100, unit: 'kg', price_per_unit: 12.00, description: 'Ripe Roma tomatoes.', location: 'Leribe', status: 'active' },
    { user_id: farmer2.id, crop_name: 'Green Beans', category: 'vegetables', quantity: 50, unit: 'kg', price_per_unit: 15.00, description: 'Freshly picked green beans.', location: 'Leribe', status: 'active' },
    { user_id: farmer1.id, crop_name: 'Peaches', category: 'fruits', quantity: 80, unit: 'kg', price_per_unit: 18.00, description: 'Sweet highland peaches.', location: 'Berea', status: 'active' },
    { user_id: farmer2.id, crop_name: 'Potatoes', category: 'vegetables', quantity: 300, unit: 'kg', price_per_unit: 8.50, description: 'Lesotho highland potatoes.', location: 'Leribe', status: 'active' },
  ]);

  // Sample crop prices
  await CropPrice.bulkCreate([
    { crop_name: 'Maize', category: 'grains', avg_price: 6.50, min_price: 5.50, max_price: 7.50, market: 'Maseru Central Market', recorded_date: new Date() },
    { crop_name: 'Sorghum', category: 'grains', avg_price: 7.00, min_price: 6.00, max_price: 8.00, market: 'Maseru Central Market', recorded_date: new Date() },
    { crop_name: 'Wheat', category: 'grains', avg_price: 9.50, min_price: 8.00, max_price: 11.00, market: 'Maseru Central Market', recorded_date: new Date() },
    { crop_name: 'Tomatoes', category: 'vegetables', avg_price: 12.00, min_price: 9.00, max_price: 15.00, market: 'Leribe Market', recorded_date: new Date() },
    { crop_name: 'Potatoes', category: 'vegetables', avg_price: 8.50, min_price: 7.00, max_price: 10.00, market: 'Leribe Market', recorded_date: new Date() },
    { crop_name: 'Peaches', category: 'fruits', avg_price: 18.00, min_price: 15.00, max_price: 22.00, market: 'Maseru Central Market', recorded_date: new Date() },
    { crop_name: 'Apples', category: 'fruits', avg_price: 20.00, min_price: 16.00, max_price: 25.00, market: 'Maseru Central Market', recorded_date: new Date() },
    { crop_name: 'Beans (Dry)', category: 'legumes', avg_price: 22.00, min_price: 18.00, max_price: 26.00, market: 'Maseru Central Market', recorded_date: new Date() },
  ]);

  // Sample farming tips
  await FarmingTip.bulkCreate([
    { title: 'Best Time to Plant Maize in Lesotho', content: 'The optimal planting time for maize in Lesotho is from November to December. Soil temperature should be at least 15°C. Ensure adequate rainfall or irrigation is available. Plant seeds 5cm deep and 25cm apart in rows 75cm apart.', category: 'general', author_id: advisor.id },
    { title: 'Natural Pest Control Methods', content: 'Avoid chemical pesticides wherever possible. Use companion planting (e.g. marigolds near tomatoes) to repel pests. Neem oil spray is effective against aphids and whitefly. Encourage natural predators like ladybirds.', category: 'pest-control', author_id: advisor.id },
    { title: 'Improving Soil Fertility', content: 'Add compost or well-rotted manure before planting season. Rotate crops each year to avoid nutrient depletion. Legumes such as beans fix nitrogen in the soil, benefiting subsequent crops.', category: 'soil', author_id: advisor.id },
    { title: 'Water Conservation Techniques', content: 'Use drip irrigation instead of overhead watering to reduce evaporation. Mulch around plants to retain moisture. Collect rainwater from rooftops for garden use during dry periods.', category: 'irrigation', author_id: advisor.id },
    { title: 'Post-Harvest Storage Tips', content: 'Dry grains thoroughly before storage. Store in cool, dry, well-ventilated areas. Use hermetic bags or metal silos to prevent pest infestations. Check stored produce regularly for signs of moisture or pests.', category: 'storage', author_id: advisor.id },
  ]);

  console.log('✅ Database seeded with initial data.');
  console.log('   Admin: admin@agriconnect.ls / Admin@1234');
  console.log('   Farmer: thabo@agriconnect.ls / Farmer@1234');
  console.log('   Advisor: mphato@agriconnect.ls / Advisor@1234');
};

start();
