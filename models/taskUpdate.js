const mongoose = require('mongoose');

const TaskUpdateSchema = new mongoose.Schema(
  {
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MarketingTask',
      required: false
    },
    description: {
      type: String,
      required: false
    },
    startDate: {
      type: Date,
      required: false
    },
    endDate: {
      type: Date,
      required: false
    },
    attachments: [{
      type: String,  // URLs or file paths to media files
      required: false
    }],
    leadsInfo: [{
      name: {
        type: String,
        required: false
      },
      description: {
        type: String,
        required: false
      },
      contact: {
        type: String,
        required: false
      }, 
      email: {
        type: String,
        required: false
      }
    }],
    updatedBy: {
      id: {
        type: mongoose.Schema.Types.ObjectId,
        required: false
      },
      name: {
        type: String,
        required: false
      }
    },
    comments: [{
      text: {
        type: String,
        required: false
      },
      createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        required: false
      },
      name: {
        type: String,
        required: false
      },
      role: {
        type: String,
        required: false
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }]
  },
  {
    timestamps: true
  }
);

const TaskUpdate = mongoose.model('TaskUpdate', TaskUpdateSchema);

module.exports = TaskUpdate;
