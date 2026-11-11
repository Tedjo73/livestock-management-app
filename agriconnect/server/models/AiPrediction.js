const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AiPrediction = sequelize.define('AiPrediction', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  crop_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  district: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  season: {
    type: DataTypes.STRING(20),
    allowNull: false,
  },
  quantity_kg: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  farm_size_ha: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 1.0,
  },
  fertilizer_kg_per_ha: {
    type: DataTypes.INTEGER,
    defaultValue: 140,
  },
  predicted_price_per_kg: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  expected_gross_revenue: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  estimated_transport_cost: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  expected_net_revenue: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  market_demand_index: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  demand_tier: {
    type: DataTypes.STRING(20),
    allowNull: false,
  },
  predicted_days_to_sell: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  recommended_depot: {
    type: DataTypes.STRING(150),
    allowNull: false,
  },
  confidence_score: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 92.42,
  },
}, {
  tableName: 'ai_predictions',
  timestamps: true,
  underscored: true,
});

module.exports = AiPrediction;

