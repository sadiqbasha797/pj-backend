const Notification = require('../models/Notification');
const Developer = require('../models/Developer');
const Manager = require('../models/Manager');
const Admin = require('../models/Admin');
const DigitalMarketingRole = require('../models/digitalMarketingRole');
const ContentCreator = require('../models/contentCreator');

const createNotification = async (recipients, content, type, relatedId) => {
    const notification = new Notification({
        recipient: recipients,
        content: content,
        type: type,
        relatedId: relatedId
    });
    await notification.save();
};

// Function to notify when a project, event, or task is created
const notifyCreation = async (recipients, itemType, itemTitle, itemId) => {
    const content = `New ${itemType} created: ${itemTitle}`;
    await createNotification(recipients, content, itemType, itemId);
};


// Function to notify when a project, event, or task is updated
const notifyUpdate = async (recipients, itemType, itemTitle, itemId) => {
    const content = `${itemType} updated: ${itemTitle}`;
    await createNotification(recipients, content, itemType, itemId);
};

// Function to notify when a holiday is requested
const leaveNotification = async (recipients, developerName, leaveId) => {
    const content = `New leave application from ${developerName}`;
    await createNotification(recipients, content, 'Holiday', leaveId);
};

// Function to notify when a holiday is updated (approved, withdrawn, etc.)
const leaveUpdateNotification = async (recipient, content, leaveId) => {
    await createNotification([recipient], content, 'Leave', leaveId);
};

module.exports = {
    createNotification,
    notifyCreation,
    notifyUpdate,
    leaveNotification,
    leaveUpdateNotification
};
