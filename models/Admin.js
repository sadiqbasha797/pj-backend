const mongoose = require('mongoose');

const AdminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  profileImage: { type: String },
  address: { type: String },
  mobile: { type: String },
  socialLinks: {
    instagram: { type: String },
    twitter: { type: String }, 
    linkedin: { type: String },
    facebook: { type: String }
  },
  companyDetails: {
    name: { type: String },
    logo: { type: String },
    address: { type: String },
    established: { type: Date },
    achievements: [{ type: String }],
    socialLinks: {
      instagram: { type: String },
      twitter: { type: String },
      linkedin: { type: String },
      facebook: { type: String }
    }
  },
  resetPasswordOTP: { 
    code: { type: String },
    expiresAt: { type: Date }
  },
  createdAt: { type: Date, default: Date.now },
  role: { type: String, default: "admin" }
});

const Admin = mongoose.model('Admin', AdminSchema);

module.exports = Admin;
