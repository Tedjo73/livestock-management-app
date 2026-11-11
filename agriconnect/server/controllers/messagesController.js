const { Message, User, Listing } = require('../models');
const { Op } = require('sequelize');

/**
 * GET /api/messages/conversations
 * Get list of all conversations for current user
 */
const getConversations = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get all users this user has talked to
    const messages = await Message.findAll({
      where: {
        [Op.or]: [{ sender_id: userId }, { receiver_id: userId }],
      },
      include: [
        { model: User, as: 'sender', attributes: ['id', 'name', 'location'] },
        { model: User, as: 'receiver', attributes: ['id', 'name', 'location'] },
      ],
      order: [['created_at', 'DESC']],
    });

    // Build conversation list (deduplicated by partner)
    const conversations = {};
    messages.forEach((msg) => {
      const partnerId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id;
      const partner = msg.sender_id === userId ? msg.receiver : msg.sender;
      if (!conversations[partnerId]) {
        conversations[partnerId] = {
          partnerId,
          partner,
          lastMessage: msg.content,
          lastMessageAt: msg.created_at,
          unreadCount: !msg.is_read && msg.receiver_id === userId ? 1 : 0,
        };
      } else if (!msg.is_read && msg.receiver_id === userId) {
        conversations[partnerId].unreadCount += 1;
      }
    });

    return res.json({ conversations: Object.values(conversations) });
  } catch (err) {
    console.error('Get conversations error:', err);
    return res.status(500).json({ error: 'Failed to fetch conversations.' });
  }
};

/**
 * GET /api/messages/:partnerId
 * Get all messages between current user and partner
 */
const getMessages = async (req, res) => {
  try {
    const userId = req.user.id;
    const partnerId = parseInt(req.params.partnerId);

    const messages = await Message.findAll({
      where: {
        [Op.or]: [
          { sender_id: userId, receiver_id: partnerId },
          { sender_id: partnerId, receiver_id: userId },
        ],
      },
      include: [
        { model: User, as: 'sender', attributes: ['id', 'name'] },
        { model: Listing, as: 'listing', attributes: ['id', 'crop_name'] },
      ],
      order: [['created_at', 'ASC']],
    });

    // Mark messages as read
    await Message.update(
      { is_read: true },
      { where: { sender_id: partnerId, receiver_id: userId, is_read: false } }
    );

    return res.json({ messages });
  } catch (err) {
    console.error('Get messages error:', err);
    return res.status(500).json({ error: 'Failed to fetch messages.' });
  }
};

/**
 * POST /api/messages
 * Send a message
 */
const sendMessage = async (req, res) => {
  try {
    const { receiver_id, content, listing_id } = req.body;

    if (!receiver_id || !content) {
      return res.status(400).json({ error: 'receiver_id and content are required.' });
    }

    if (receiver_id === req.user.id) {
      return res.status(400).json({ error: 'Cannot send a message to yourself.' });
    }

    const receiver = await User.findByPk(receiver_id);
    if (!receiver) return res.status(404).json({ error: 'Recipient not found.' });

    const message = await Message.create({
      sender_id: req.user.id,
      receiver_id,
      content,
      listing_id: listing_id || null,
    });

    return res.status(201).json({ message });
  } catch (err) {
    console.error('Send message error:', err);
    return res.status(500).json({ error: 'Failed to send message.' });
  }
};

/**
 * GET /api/messages/unread/count
 */
const getUnreadCount = async (req, res) => {
  try {
    const count = await Message.count({
      where: { receiver_id: req.user.id, is_read: false },
    });
    return res.json({ unreadCount: count });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to get unread count.' });
  }
};

module.exports = { getConversations, getMessages, sendMessage, getUnreadCount };
