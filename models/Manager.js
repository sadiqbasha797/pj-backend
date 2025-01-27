const mongoose = require('mongoose');

const ManagerSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  image: { type: String }, // Profile image URL/path
  mobile: { type: String }, // Mobile number
  teamSize: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  role: { type: String, default: "manager" },
  developers: [{
    developerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Developer' },
    developerName: { type: String },
    assignedOn: { type: Date, default: Date.now }
  }],
  digitalMarketingRoles: [{
    roleId: { type: mongoose.Schema.Types.ObjectId, ref: 'DigitalMarketingRole' },
    roleName: { type: String },
    assignedOn: { type: Date, default: Date.now }
  }],
  contentCreators: [{
    roleId: { type: mongoose.Schema.Types.ObjectId, ref: 'ContentCreator' },
    roleName: { type: String },
    assignedOn: { type: Date, default: Date.now }
  }]
});

const Manager = mongoose.model('Manager', ManagerSchema);

module.exports = Manager;
