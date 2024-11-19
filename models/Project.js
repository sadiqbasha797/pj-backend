const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ProjectSchema = new Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  deadline: {
    type: Date,
    required: true
  },
  assignedTo: [{
    type: Schema.Types.ObjectId,
    ref: 'Developer', // Adjust if you have a different reference, like a generic 'User' model.
    required: true
  }],
  relatedDocs: [{
    type: String, // URL to the document
    required: false
  }],
  status: {
    type: String,
    enum: ['Assigned', 'Started', 'In-Progress', 'Testing', 'Completed'],
    default: 'Assigned'
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    refpath: 'onModel', // Reference to User model who created the project
    required: true
  },
  updatedAt: {
    type: Date,
    default: Date.now // Automatically set to the current date on creation/update
  },
  lastUpdatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'Developer', // Reference to User model who last updated the project
    required: true
  }
}, { timestamps: true }); // Mongoose manages createdAt and updatedAt fields automatically

const Project = mongoose.model('Project', ProjectSchema);
module.exports = Project;
