const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const NotificationSchema = new Schema({
    recipient: [{
        type: Schema.Types.ObjectId,
        required: false,
    }],
    content: {
        type: String,
        required: true
    },
    read: {
        type: Boolean,
        default: false
    },
    relatedId: {  // ID of the project, event, etc.
        type: Schema.Types.ObjectId,
        required: false
    },
    type: {  // Type of notification, e.g., 'Project', 'Event', 'Holiday'
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Notification = mongoose.model('Notification', NotificationSchema);

module.exports = Notification;
