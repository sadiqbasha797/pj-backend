const mongoose = require('mongoose');

const DigitalMarketingRoleSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  skills: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
  role: { type: String, default: "digital-marketing" },
  image: { type: String }
});

const DigitalMarketingRole = mongoose.model('DigitalMarketingRole', DigitalMarketingRoleSchema);

module.exports = DigitalMarketingRole;



