const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  sender: {
    id: { type: mongoose.Schema.Types.ObjectId, required: true },
    role: { type: String, required: true, enum: ['admin', 'manager', 'developer'] }
  },
  receiver: {
    id: { type: mongoose.Schema.Types.ObjectId, required: true },
    role: { type: String, required: true, enum: ['admin', 'manager', 'developer'] }
  },
  content: { type: String, required: true },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const Message = mongoose.model('Message', MessageSchema);

module.exports = Message;
