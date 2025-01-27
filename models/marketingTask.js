const mongoose = require('mongoose');

const MarketingTaskSchema = new mongoose.Schema(
  {
    "taskName": {
      "type": String,
      "required": true
    },
    "taskDescription": {
      "type": String,
      "required": true
    },
    "projectId": {
      "type": mongoose.Schema.Types.ObjectId,
      "ref": "Project",
      "required": true
    },
    "assignedTo": [
      {
        "id": {
          "type": mongoose.Schema.Types.ObjectId,
          "required": true
        },
        "role": {
          "type": String,
          "enum": ["DigitalMarketingRole", "ContentCreator"],
          "required": true
        }
      }
    ],
    "priority": {
      "type": String,
      "enum": ["low", "medium", "high"],
      "default": "medium"
    },
    "startDate": {
      "type": Date,
      "default": Date.now
    },
    "endDate": {
      "type": Date,
      "required": true
    },
    "leads": {
      "type": Number,
      "default": 0
    },
    "status": {
      "type": String,
      "enum": ["pending", "in-progress", "completed"],
      "default": "pending"
    },
    "createdBy": {
      "type": mongoose.Schema.Types.ObjectId,
      "required": true
    },
    "relatedDocs": [
      {
        "type": String,
        "required": false
      }
    ]
  },
  {
    "timestamps": true
  }
);

const MarketingTask = mongoose.model('MarketingTask', MarketingTaskSchema);

module.exports = MarketingTask;
