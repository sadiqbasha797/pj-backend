const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const messageAuth = require('../middleware/messageAuth');

// All routes should use messageAuth middleware
router.post('/send', messageAuth, messageController.sendMessage);
router.get('/conversation/:otherUserId', messageAuth, messageController.getConversation);
router.patch('/read/:messageId', messageAuth, messageController.markAsRead);
router.get('/unread', messageAuth, messageController.getUnreadCount);

module.exports = router; 