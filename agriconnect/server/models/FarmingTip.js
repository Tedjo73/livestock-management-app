const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const FarmingTip = sequelize.define('FarmingTip', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false,
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  category: {
    type: DataTypes.ENUM('soil', 'irrigation', 'pest-control', 'harvest', 'storage', 'general'),
    defaultValue: 'general',
  },
  author_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'users', key: 'id' },
  },
  image_url: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  is_published: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'farming_tips',
  timestamps: true,
});

module.exports = FarmingTip;
