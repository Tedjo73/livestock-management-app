/**
 * PostgreSQL Database Seeder for AgriConnect
 * Populates all tables in PostgreSQL (Users, Listings, Prices, Tips, AI Dataset, Metrics, Blockchain)
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const sequelize = require('../config/database');
const {
  User,
  Listing,
  CropPrice,
  FarmingTip,
  AiMarketData,
  AiModelMetric,
  BlockchainBlock
} = require('../models');

const seedPostgres = async () => {
  try {
    console.log('🔄 Connecting to PostgreSQL database...');
    await sequelize.authenticate();
    console.log('✅ Connected to PostgreSQL successfully.');

    console.log('🔄 Synchronizing PostgreSQL schema...');
    await sequelize.sync({ alter: true });
    console.log('✅ PostgreSQL tables synchronized.');

    // 1. Seed Users
    const existingAdmin = await User.findOne({ where: { email: 'admin@agriconnect.ls' } });
    let admin, farmer1, farmer2, advisor;

    if (!existingAdmin) {
      console.log('🌱 Seeding users into PostgreSQL...');
      const adminHash = await bcrypt.hash('Admin@1234', 12);
      const farmerHash = await bcrypt.hash('Farmer@1234', 12);
      const advisorHash = await bcrypt.hash('Advisor@1234', 12);

      admin = await User.create({ name: 'System Admin', email: 'admin@agriconnect.ls', password_hash: adminHash, role: 'admin', location: 'Maseru' });
      farmer1 = await User.create({ name: 'Thabo Mokoena', email: 'thabo@agriconnect.ls', password_hash: farmerHash, role: 'farmer', phone: '+266 5812 3456', location: 'Berea' });
      farmer2 = await User.create({ name: 'Lineo Ntšo', email: 'lineo@agriconnect.ls', password_hash: farmerHash, role: 'farmer', phone: '+266 5823 4567', location: 'Leribe' });
      advisor = await User.create({ name: 'Dr. Mphato Letsie', email: 'mphato@agriconnect.ls', password_hash: advisorHash, role: 'advisor', phone: '+266 5867 8901', location: 'Maseru' });
    } else {
      admin = existingAdmin;
      farmer1 = await User.findOne({ where: { email: 'thabo@agriconnect.ls' } });
      farmer2 = await User.findOne({ where: { email: 'lineo@agriconnect.ls' } });
      advisor = await User.findOne({ where: { email: 'mphato@agriconnect.ls' } });
    }

    // 2. Seed Listings if empty
    const listingCount = await Listing.count();
    if (listingCount === 0 && farmer1) {
      console.log('🌱 Seeding listings into PostgreSQL...');
      await Listing.bulkCreate([
        { user_id: farmer1.id, crop_name: 'Maize', category: 'grains', quantity: 500, unit: 'kg', price_per_unit: 6.50, description: 'Fresh maize, highland harvest.', location: 'Berea', status: 'active', blockchain_tx_hash: '0x8f2a1b9c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f01' },
        { user_id: farmer1.id, crop_name: 'Sorghum', category: 'grains', quantity: 200, unit: 'kg', price_per_unit: 7.20, description: 'Organic highland sorghum.', location: 'Berea', status: 'active', blockchain_tx_hash: '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b' },
        { user_id: farmer2.id, crop_name: 'Tomatoes', category: 'vegetables', quantity: 150, unit: 'kg', price_per_unit: 12.50, description: 'Fresh ripe Roma tomatoes.', location: 'Leribe', status: 'active', blockchain_tx_hash: '0x3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f01a2b3c4d5e6f7a8b9c0d1e2f3a4b5' },
        { user_id: farmer2.id, crop_name: 'Potatoes', category: 'vegetables', quantity: 400, unit: 'kg', price_per_unit: 8.80, description: 'Highland washed potatoes.', location: 'Leribe', status: 'active', blockchain_tx_hash: '0x5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f01a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7' },
        { user_id: farmer1.id, crop_name: 'Peaches', category: 'fruits', quantity: 80, unit: 'kg', price_per_unit: 19.00, description: 'Sweet highland peaches.', location: 'Berea', status: 'active', blockchain_tx_hash: '0x7f8a9b0c1d2e3f4a5b6c7d8e9f01a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9' },
      ]);
    }

    // 3. Seed Crop Prices if empty
    const pricesCount = await CropPrice.count();
    if (pricesCount === 0) {
      console.log('🌱 Seeding crop prices into PostgreSQL...');
      await CropPrice.bulkCreate([
        { crop_name: 'Maize', category: 'grains', avg_price: 6.50, min_price: 5.50, max_price: 7.50, market: 'Maseru Central Market', recorded_date: new Date() },
        { crop_name: 'Sorghum', category: 'grains', avg_price: 7.20, min_price: 6.00, max_price: 8.50, market: 'Maseru Central Market', recorded_date: new Date() },
        { crop_name: 'Wheat', category: 'grains', avg_price: 9.80, min_price: 8.50, max_price: 11.20, market: 'Maseru Central Market', recorded_date: new Date() },
        { crop_name: 'Tomatoes', category: 'vegetables', avg_price: 12.50, min_price: 9.50, max_price: 16.00, market: 'Leribe Market', recorded_date: new Date() },
        { crop_name: 'Potatoes', category: 'vegetables', avg_price: 8.80, min_price: 7.20, max_price: 10.50, market: 'Leribe Market', recorded_date: new Date() },
        { crop_name: 'Beans (Dry)', category: 'legumes', avg_price: 22.50, min_price: 19.00, max_price: 26.50, market: 'Maseru Central Market', recorded_date: new Date() },
        { crop_name: 'Peaches', category: 'fruits', avg_price: 19.00, min_price: 16.00, max_price: 23.00, market: 'Maseru Central Market', recorded_date: new Date() },
        { crop_name: 'Cabbage', category: 'vegetables', avg_price: 7.00, min_price: 5.50, max_price: 8.50, market: 'Berea Market', recorded_date: new Date() },
      ]);
    }

    // 4. Seed Farming Tips if empty
    const tipsCount = await FarmingTip.count();
    if (tipsCount === 0 && advisor) {
      console.log('🌱 Seeding farming tips into PostgreSQL...');
      await FarmingTip.bulkCreate([
        { title: 'Best Time to Plant Maize in Lesotho', content: 'The optimal planting time for maize in Lesotho is from November to December. Soil temperature should be at least 15°C.', category: 'general', author_id: advisor.id },
        { title: 'Natural Pest Control Methods', content: 'Avoid chemical pesticides wherever possible. Use companion planting to repel aphids and encourage ladybirds.', category: 'pest-control', author_id: advisor.id },
        { title: 'Improving Highland Soil Fertility', content: 'Add compost or well-rotted manure before planting. Legumes such as beans fix nitrogen in the soil.', category: 'soil', author_id: advisor.id },
      ]);
    }

    // 5. Seed AI Market Dataset (1,200 Observations directly into PostgreSQL!)
    const aiDataCount = await AiMarketData.count();
    if (aiDataCount === 0) {
      console.log('🌱 Importing 1,200 AI dataset records into PostgreSQL table (ai_market_dataset)...');
      const csvPath = path.join(__dirname, '..', '..', 'ai', 'data', 'lesotho_crop_market_dataset.csv');
      if (fs.existsSync(csvPath)) {
        const raw = fs.readFileSync(csvPath, 'utf8').trim().split('\n');
        const headers = raw[0].split(',');
        const rows = raw.slice(1).map(line => {
          const vals = line.split(',');
          return {
            record_id: vals[0],
            record_date: vals[1],
            month: vals[2],
            season: vals[3],
            district: vals[4],
            crop_name: vals[5],
            category: vals[6],
            farm_size_ha: parseFloat(vals[7]),
            rainfall_mm: parseFloat(vals[8]),
            temperature_c: parseFloat(vals[9]),
            soil_ph: parseFloat(vals[10]),
            fertilizer_kg_per_ha: parseInt(vals[11], 10),
            historical_avg_price_lsl: parseFloat(vals[12]),
            competitor_supply_tons: parseInt(vals[13], 10),
            market_demand_index: parseInt(vals[14], 10),
            transport_cost_lsl: parseInt(vals[15], 10),
            yield_tons: parseFloat(vals[16]),
            actual_price_per_kg_lsl: parseFloat(vals[17]),
            sales_volume_kg: parseInt(vals[18], 10),
            revenue_lsl: parseInt(vals[19], 10),
            days_to_sell: parseInt(vals[20], 10),
            demand_tier: vals[21],
          };
        });

        // Insert in batches of 300
        for (let i = 0; i < rows.length; i += 300) {
          const batch = rows.slice(i, i + 300);
          await AiMarketData.bulkCreate(batch);
        }
        console.log(`✅ Successfully stored ${rows.length} empirical records in PostgreSQL!`);
      }
    } else {
      console.log(`ℹ️  ai_market_dataset already contains ${aiDataCount} records in PostgreSQL.`);
    }

    // 6. Seed AI Model Metrics
    const metricsCount = await AiModelMetric.count();
    if (metricsCount === 0) {
      console.log('🌱 Seeding model benchmark metrics into PostgreSQL (ai_model_metrics)...');
      await AiModelMetric.bulkCreate([
        {
          model_name: 'Random Forest Regressor',
          algorithm: 'Ensemble Bagging (100 Decision Trees, Max Depth 12)',
          r2_score: 0.9242,
          rmse_lsl: 1.1480,
          mae_lsl: 0.8350,
          mape_percent: 7.82,
          cv_score_mean: 0.9184,
          is_best_model: true,
        },
        {
          model_name: 'Gradient Boosting Regressor',
          algorithm: 'Ensemble Boosting (n_estimators=100, lr=0.1)',
          r2_score: 0.9085,
          rmse_lsl: 1.2820,
          mae_lsl: 0.9570,
          mape_percent: 8.94,
          cv_score_mean: 0.9012,
          is_best_model: false,
        },
        {
          model_name: 'Decision Tree Regressor',
          algorithm: 'Single CART Tree (Max Depth 8)',
          r2_score: 0.8315,
          rmse_lsl: 1.7640,
          mae_lsl: 1.3200,
          mape_percent: 12.18,
          cv_score_mean: 0.8190,
          is_best_model: false,
        },
        {
          model_name: 'Multiple Linear Regression',
          algorithm: 'Ordinary Least Squares (Parametric Baseline)',
          r2_score: 0.7621,
          rmse_lsl: 2.0950,
          mae_lsl: 1.6480,
          mape_percent: 15.30,
          cv_score_mean: 0.7510,
          is_best_model: false,
        },
      ]);
      console.log('✅ Stored AI model benchmarks in PostgreSQL.');
    }

    // 7. Seed Blockchain Ledger
    const blockCount = await BlockchainBlock.count();
    if (blockCount === 0) {
      console.log('🌱 Seeding blockchain blocks into PostgreSQL (blockchain_ledger)...');
      await BlockchainBlock.bulkCreate([
        {
          block_height: 1,
          listing_id: 1,
          crop_name: 'Maize',
          quantity_kg: 500,
          price_per_kg_lsl: 6.50,
          seller_id: 2,
          record_hash: '0x9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b',
          previous_block_hash: '0x0000000000000000000000000000000000000000000000000000000000000000',
          merkle_root: '0x4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f01a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6',
          transaction_hash: '0x8f2a1b9c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f01',
          validator_address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
          is_verified: true,
        },
        {
          block_height: 2,
          listing_id: 3,
          crop_name: 'Tomatoes',
          quantity_kg: 150,
          price_per_kg_lsl: 12.50,
          seller_id: 3,
          record_hash: '0x7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f',
          previous_block_hash: '0x8f2a1b9c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f01',
          merkle_root: '0x2e3f4a5b6c7d8e9f01a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4',
          transaction_hash: '0x3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f01a2b3c4d5e6f7a8b9c0d1e2f3a4b5',
          validator_address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
          is_verified: true,
        },
      ]);
      console.log('✅ Stored blockchain ledger blocks in PostgreSQL.');
    }

    console.log('🎉 PostgreSQL database seeding completed successfully!');
    if (require.main === module) {
      process.exit(0);
    }
  } catch (err) {
    console.error('❌ Error during PostgreSQL seeding:', err.message);
    if (require.main === module) {
      process.exit(1);
    }
    throw err;
  }
};

if (require.main === module) {
  seedPostgres();
}

module.exports = seedPostgres;

