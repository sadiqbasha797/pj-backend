const Message = require('../models/message');
const Admin = require('../models/Admin');
const Manager = require('../models/Manager');
const Developer = require('../models/Developer');
const nodemailer = require('nodemailer');

// Email configuration (reusing from adminController)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'khanbasha7777777@gmail.com',
        pass: 'hpdi qrqk plrn blzz'
    }
});

const sendMessageNotification = async (receiverEmail, senderName, messagePreview) => {
    const mailOptions = {
        from: 'khanbasha7777777@gmail.com',
        to: receiverEmail,
        subject: 'New Message Received',
        text: `You have received a new message from ${senderName}.\n\nMessage Preview: ${messagePreview.substring(0, 100)}...`
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Email notification sent successfully');
    } catch (error) {
        console.log('Error sending email notification:', error);
    }
};

const getUserById = async (userId, role) => {
    switch (role) {
        case 'admin':
            return await Admin.findById(userId);
        case 'manager':
            return await Manager.findById(userId);
        case 'developer':
            return await Developer.findById(userId);
        default:
            return null;
    }
};

// Controller methods
const messageController = {
    sendMessage: async (req, res) => {
        try {
            const { receiverId, receiverRole, content } = req.body;
            const senderId = req.user._id;
            const senderRole = req.user.role;

            const newMessage = new Message({
                sender: { id: senderId, role: senderRole },
                receiver: { id: receiverId, role: receiverRole },
                content
            });

            await newMessage.save();

            // Get receiver's email for notification
            const receiver = await getUserById(receiverId, receiverRole);
            
            if (receiver && receiver.email) {
                await sendMessageNotification(
                    receiver.email,
                    req.user.username,
                    content
                );
            }

            // Emit socket event
            if (req.app.get('io')) {
                req.app.get('io').emit('newMessage', {
                    message: newMessage,
                    receiverId
                });
            }

            res.status(201).json(newMessage);
        } catch (error) {
            console.error('Error in sendMessage:', error);
            res.status(500).json({ message: 'Error sending message', error: error.message });
        }
    },

    getConversation: async (req, res) => {
        try {
            const userId = req.user._id;
            const { otherUserId } = req.params;

            const messages = await Message.find({
                $or: [
                    { 'sender.id': userId, 'receiver.id': otherUserId },
                    { 'sender.id': otherUserId, 'receiver.id': userId }
                ]
            }).sort({ createdAt: 1 });

            res.status(200).json(messages);
        } catch (error) {
            res.status(500).json({ message: 'Error fetching conversation', error: error.message });
        }
    },

    markAsRead: async (req, res) => {
        try {
            const { messageId } = req.params;
            const userId = req.user._id;

            const message = await Message.findOneAndUpdate(
                {
                    _id: messageId,
                    'receiver.id': userId
                },
                { read: true },
                { new: true }
            );

            if (!message) {
                return res.status(404).json({ message: 'Message not found or unauthorized' });
            }

            res.status(200).json(message);
        } catch (error) {
            res.status(500).json({ message: 'Error marking message as read', error: error.message });
        }
    },

    getUnreadCount: async (req, res) => {
        try {
            const userId = req.user._id;
            const count = await Message.countDocuments({
                'receiver.id': userId,
                read: false
            });
            res.status(200).json({ unreadCount: count });
        } catch (error) {
            res.status(500).json({ message: 'Error getting unread count', error: error.message });
        }
    }
};

module.exports = messageController; 