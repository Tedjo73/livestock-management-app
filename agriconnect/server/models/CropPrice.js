const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CropPrice = sequelize.define('CropPrice', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  crop_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  category: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  avg_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: 'Price in Maloti (LSL) per kg',
  },
  min_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  max_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  market: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  recorded_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'crop_prices',
  timestamps: true,
});

module.exports = CropPrice;
