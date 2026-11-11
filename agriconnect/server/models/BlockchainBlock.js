const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const BlockchainBlock = sequelize.define('BlockchainBlock', {
  block_height: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  listing_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  crop_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  quantity_kg: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  price_per_kg_lsl: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  seller_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  record_hash: {
    type: DataTypes.STRING(66),
    allowNull: false,
  },
  previous_block_hash: {
    type: DataTypes.STRING(66),
    allowNull: false,
  },
  merkle_root: {
    type: DataTypes.STRING(66),
    allowNull: false,
  },
  transaction_hash: {
    type: DataTypes.STRING(66),
    allowNull: false,
    unique: true,
  },
  validator_address: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  is_verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'blockchain_ledger',
  timestamps: true,
  underscored: true,
});

module.exports = BlockchainBlock;

