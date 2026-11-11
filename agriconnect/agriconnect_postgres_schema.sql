-- =============================================================================
-- AgriConnect PostgreSQL Database Schema
-- DIDT3110: Digital Strategy for Business Transformation
-- Database: agriconnect
-- =============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'farmer' CHECK (role IN ('farmer', 'buyer', 'advisor', 'admin')),
    phone VARCHAR(30) DEFAULT NULL,
    location VARCHAR(100) DEFAULT NULL,
    profile_image VARCHAR(255) DEFAULT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 3. CROP PRICES TABLE
CREATE TABLE IF NOT EXISTS crop_prices (
    id SERIAL PRIMARY KEY,
    crop_name VARCHAR(100) NOT NULL,
    category VARCHAR(50) DEFAULT NULL,
    avg_price NUMERIC(10, 2) NOT NULL,
    min_price NUMERIC(10, 2) DEFAULT NULL,
    max_price NUMERIC(10, 2) DEFAULT NULL,
    market VARCHAR(100) NOT NULL,
    recorded_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_crop_prices_crop ON crop_prices(crop_name);
CREATE INDEX IF NOT EXISTS idx_crop_prices_market ON crop_prices(market);

-- 4. FARMING TIPS TABLE
CREATE TABLE IF NOT EXISTS farming_tips (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(50) DEFAULT 'general',
    author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    image_url VARCHAR(255) DEFAULT NULL,
    is_published BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_farming_tips_author ON farming_tips(author_id);
CREATE INDEX IF NOT EXISTS idx_farming_tips_category ON farming_tips(category);

-- 5. LISTINGS TABLE
CREATE TABLE IF NOT EXISTS listings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    crop_name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    quantity NUMERIC(10, 2) NOT NULL,
    unit VARCHAR(20) DEFAULT 'kg',
    price_per_unit NUMERIC(10, 2) NOT NULL,
    description TEXT DEFAULT NULL,
    location VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'sold', 'expired')),
    image_url VARCHAR(255) DEFAULT NULL,
    blockchain_tx_hash VARCHAR(66) DEFAULT NULL,
    views INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_listings_user_id ON listings(user_id);
CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_crop ON listings(crop_name);

-- 6. MESSAGES TABLE
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    listing_id INTEGER REFERENCES listings(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);

-- =============================================================================
-- PART D: ARTIFICIAL INTELLIGENCE & MARKET DATA TABLES
-- =============================================================================

-- 7. AI MARKET DATASET (1,200 Observations in PostgreSQL)
CREATE TABLE IF NOT EXISTS ai_market_dataset (
    id SERIAL PRIMARY KEY,
    record_id VARCHAR(20) NOT NULL UNIQUE,
    record_date DATE NOT NULL,
    month VARCHAR(10) NOT NULL,
    season VARCHAR(20) NOT NULL CHECK (season IN ('Summer', 'Autumn', 'Winter', 'Spring')),
    district VARCHAR(50) NOT NULL,
    crop_name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    farm_size_ha NUMERIC(10, 2) NOT NULL,
    rainfall_mm NUMERIC(10, 2) NOT NULL,
    temperature_c NUMERIC(10, 2) NOT NULL,
    soil_ph NUMERIC(10, 2) NOT NULL,
    fertilizer_kg_per_ha INTEGER NOT NULL,
    historical_avg_price_lsl NUMERIC(10, 2) NOT NULL,
    competitor_supply_tons INTEGER NOT NULL,
    market_demand_index INTEGER NOT NULL,
    transport_cost_lsl INTEGER NOT NULL,
    yield_tons NUMERIC(10, 2) NOT NULL,
    actual_price_per_kg_lsl NUMERIC(10, 2) NOT NULL,
    sales_volume_kg INTEGER NOT NULL,
    revenue_lsl INTEGER NOT NULL,
    days_to_sell INTEGER NOT NULL,
    demand_tier VARCHAR(20) NOT NULL CHECK (demand_tier IN ('High', 'Medium', 'Low')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_dataset_district ON ai_market_dataset(district);
CREATE INDEX IF NOT EXISTS idx_ai_dataset_crop ON ai_market_dataset(crop_name);
CREATE INDEX IF NOT EXISTS idx_ai_dataset_season ON ai_market_dataset(season);
CREATE INDEX IF NOT EXISTS idx_ai_dataset_month ON ai_market_dataset(month);

-- 8. AI PREDICTIONS LOG (Live inference queries recorded in PostgreSQL)
CREATE TABLE IF NOT EXISTS ai_predictions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    crop_name VARCHAR(100) NOT NULL,
    district VARCHAR(50) NOT NULL,
    season VARCHAR(20) NOT NULL,
    quantity_kg NUMERIC(10, 2) NOT NULL,
    farm_size_ha NUMERIC(10, 2) DEFAULT 1.0,
    fertilizer_kg_per_ha INTEGER DEFAULT 140,
    predicted_price_per_kg NUMERIC(10, 2) NOT NULL,
    expected_gross_revenue INTEGER NOT NULL,
    estimated_transport_cost INTEGER NOT NULL,
    expected_net_revenue INTEGER NOT NULL,
    market_demand_index INTEGER NOT NULL,
    demand_tier VARCHAR(20) NOT NULL,
    predicted_days_to_sell INTEGER NOT NULL,
    recommended_depot VARCHAR(150) NOT NULL,
    confidence_score NUMERIC(5, 2) DEFAULT 92.42,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_predictions_user ON ai_predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_predictions_created ON ai_predictions(created_at);

-- 9. AI MODEL METRICS & BENCHMARKS (Model Accuracy & Saturation Data)
CREATE TABLE IF NOT EXISTS ai_model_metrics (
    id SERIAL PRIMARY KEY,
    model_name VARCHAR(100) NOT NULL,
    algorithm VARCHAR(150) NOT NULL,
    r2_score NUMERIC(6, 4) NOT NULL,
    rmse_lsl NUMERIC(6, 4) NOT NULL,
    mae_lsl NUMERIC(6, 4) NOT NULL,
    mape_percent NUMERIC(6, 2) NOT NULL,
    cv_score_mean NUMERIC(6, 4) NOT NULL,
    is_best_model BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- PART B: BLOCKCHAIN LEDGER TABLE (On-Chain Blocks Stored in PostgreSQL)
-- =============================================================================

-- 10. BLOCKCHAIN LEDGER TABLE
CREATE TABLE IF NOT EXISTS blockchain_ledger (
    block_height SERIAL PRIMARY KEY,
    listing_id INTEGER REFERENCES listings(id) ON DELETE CASCADE,
    crop_name VARCHAR(100) NOT NULL,
    quantity_kg NUMERIC(10, 2) NOT NULL,
    price_per_kg_lsl NUMERIC(10, 2) NOT NULL,
    seller_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    record_hash VARCHAR(66) NOT NULL,
    previous_block_hash VARCHAR(66) NOT NULL,
    merkle_root VARCHAR(66) NOT NULL,
    transaction_hash VARCHAR(66) NOT NULL UNIQUE,
    validator_address VARCHAR(100) NOT NULL,
    is_verified BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_blockchain_tx_hash ON blockchain_ledger(transaction_hash);
CREATE INDEX IF NOT EXISTS idx_blockchain_listing_id ON blockchain_ledger(listing_id);

