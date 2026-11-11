const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AiMarketData = sequelize.define('AiMarketData', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  record_id: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
  },
  record_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  month: {
    type: DataTypes.STRING(10),
    allowNull: false,
  },
  season: {
    type: DataTypes.ENUM('Summer', 'Autumn', 'Winter', 'Spring'),
    allowNull: false,
  },
  district: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  crop_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  category: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  farm_size_ha: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  rainfall_mm: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  temperature_c: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  soil_ph: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  fertilizer_kg_per_ha: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  historical_avg_price_lsl: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  competitor_supply_tons: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  market_demand_index: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  transport_cost_lsl: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  yield_tons: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  actual_price_per_kg_lsl: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  sales_volume_kg: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  revenue_lsl: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  days_to_sell: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  demand_tier: {
    type: DataTypes.ENUM('High', 'Medium', 'Low'),
    allowNull: false,
  },
}, {
  tableName: 'ai_market_dataset',
  timestamps: true,
  underscored: true,
});

module.exports = AiMarketData;

