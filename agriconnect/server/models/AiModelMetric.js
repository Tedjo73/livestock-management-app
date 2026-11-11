const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AiModelMetric = sequelize.define('AiModelMetric', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  model_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  algorithm: {
    type: DataTypes.STRING(150),
    allowNull: false,
  },
  r2_score: {
    type: DataTypes.DECIMAL(6, 4),
    allowNull: false,
  },
  rmse_lsl: {
    type: DataTypes.DECIMAL(6, 4),
    allowNull: false,
  },
  mae_lsl: {
    type: DataTypes.DECIMAL(6, 4),
    allowNull: false,
  },
  mape_percent: {
    type: DataTypes.DECIMAL(6, 2),
    allowNull: false,
  },
  cv_score_mean: {
    type: DataTypes.DECIMAL(6, 4),
    allowNull: false,
  },
  is_best_model: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  tableName: 'ai_model_metrics',
  timestamps: true,
  underscored: true,
});

module.exports = AiModelMetric;

