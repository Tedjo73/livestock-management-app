const User = require('./User');
const Listing = require('./Listing');
const Message = require('./Message');
const CropPrice = require('./CropPrice');
const FarmingTip = require('./FarmingTip');
const AiMarketData = require('./AiMarketData');
const AiPrediction = require('./AiPrediction');
const AiModelMetric = require('./AiModelMetric');
const BlockchainBlock = require('./BlockchainBlock');

// User → Listings (one-to-many)
User.hasMany(Listing, { foreignKey: 'user_id', as: 'listings' });
Listing.belongsTo(User, { foreignKey: 'user_id', as: 'seller' });

// User → Messages (sent)
User.hasMany(Message, { foreignKey: 'sender_id', as: 'sentMessages' });
Message.belongsTo(User, { foreignKey: 'sender_id', as: 'sender' });

// User → Messages (received)
User.hasMany(Message, { foreignKey: 'receiver_id', as: 'receivedMessages' });
Message.belongsTo(User, { foreignKey: 'receiver_id', as: 'receiver' });

// Listing → Messages (context)
Listing.hasMany(Message, { foreignKey: 'listing_id', as: 'messages' });
Message.belongsTo(Listing, { foreignKey: 'listing_id', as: 'listing' });

// User → FarmingTips (advisors)
User.hasMany(FarmingTip, { foreignKey: 'author_id', as: 'tips' });
FarmingTip.belongsTo(User, { foreignKey: 'author_id', as: 'author' });

// User → AiPredictions
User.hasMany(AiPrediction, { foreignKey: 'user_id', as: 'predictions' });
AiPrediction.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Listing → BlockchainBlock
Listing.hasOne(BlockchainBlock, { foreignKey: 'listing_id', as: 'blockchainBlock' });
BlockchainBlock.belongsTo(Listing, { foreignKey: 'listing_id', as: 'listing' });

module.exports = {
  User,
  Listing,
  Message,
  CropPrice,
  FarmingTip,
  AiMarketData,
  AiPrediction,
  AiModelMetric,
  BlockchainBlock,
};
