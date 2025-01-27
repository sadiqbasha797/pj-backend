const mongoose = require('mongoose');

const ContentCreatorSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  skills: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
  role: { type: String, default: "content-creator" },
  image: { type: String }
});

const ContentCreator = mongoose.model('ContentCreator', ContentCreatorSchema);

module.exports = ContentCreator;
