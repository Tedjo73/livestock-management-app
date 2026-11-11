const express = require('express');
const { getConversations, getMessages, sendMessage, getUnreadCount } = require('../controllers/messagesController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// All message routes require authentication
router.use(authenticate);

router.get('/conversations', getConversations);
router.get('/unread/count', getUnreadCount);
router.get('/:partnerId', getMessages);
router.post('/', sendMessage);

module.exports = router;
