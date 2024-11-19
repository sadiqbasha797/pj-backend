const mongoose = require('mongoose');

const DeveloperSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  skills: [{ type: String }],
// verified: { type: String, default: 'no' },
  createdAt: { type: Date, default: Date.now },
  role: { type: String, default: "developer" },
  image: { type: String }
});

const Developer = mongoose.model('Developer', DeveloperSchema);

module.exports = Developer;
