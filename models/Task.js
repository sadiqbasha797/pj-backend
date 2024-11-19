const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TaskSchema = new Schema({
    taskName: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    projectId: {
        type: Schema.Types.ObjectId,
        ref: 'Project',
        required: false
    },
    participants: [{
        participantId: {
            type: Schema.Types.ObjectId,
            ref: 'Developer'  // Assuming participants are developers; adjust if needed
        },
       
    }],
    status: {
        type: String,
        enum: ['Assigned', 'Started', 'In-Progress', 'Completed', 'Testing'],
        default: 'Assigned'
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        required: true
    },
    relatedDocuments: [{
        type: String,
        required: false
    }],
    updates: [{
        updateId: {
            type: Schema.Types.ObjectId,
            default: () => new mongoose.Types.ObjectId(),
            required: true
        },
        content: {
            type: String,
            required: false
        },
        updatedBy: {
            type: Schema.Types.ObjectId,
            ref: 'Developer',
            required: false
        },
        updatedByName: {
            type: String,
            required: false
        },
        updatedByModel: {
            type: String,
            required: false,
            enum: ['Developer', 'Admin', 'Manager']
        },
        relatedMedia: [{
            type: String,
            required: false
        }],
        timestamp: {
            type: Date,
            default: Date.now,
            required: true
        }
    }],
    finalResult: {
        description: {
            type: String,
            required: false
        },
        resultImages: [{
            type: String,
            required: false
        }],
        updatedBy: {
            type: Schema.Types.ObjectId,
            ref: 'Developer',
            required: false
        },
        updatedByName: {
            type: String,
            required: false
        },
        updatedByModel: {
            type: String,
            required: false,
            enum: ['Developer', 'Admin', 'Manager']
        }
    }
}, { timestamps: true });

const Task = mongoose.model('Task', TaskSchema);

module.exports = Task;
