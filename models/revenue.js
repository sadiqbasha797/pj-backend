const mongoose = require('mongoose');

const revenueSchema = new mongoose.Schema({
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: false
    },
    revenueGenerated: {
        type: Number,
        required: false
    },
    date: {
        type: Date,
        required: false,
        default: Date.now
    },
    description: {
        type: String,
        required: false
    },
    attachments: [{
        type: String // This will store file paths or URLs to the attachments
    }],
    createdBy: {
        id: {
            type: mongoose.Schema.Types.ObjectId,
            required: false,
            refPath: 'createdBy.role'
        },
        name: {
            type: String,
            required: false
        },
        role: {
            type: String,
            required: false,
            enum: ['digital-marketing', 'admin', 'Manager']
        }
    }
}, {
    timestamps: true
});

const Revenue = mongoose.model('Revenue', revenueSchema);

module.exports = Revenue;
