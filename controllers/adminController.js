const Admin = require('../models/Admin');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Developer = require('../models/Developer');
const Manager = require('../models/Manager');
const Project = require('../models/Project');
const nodemailer = require('nodemailer');
const CalendarEvent = require('../models/calendarEvent');
const Holiday = require('../models/Holiday');
const { createNotification,notifyCreation,notifyUpdate,leaveUpdateNotification,leaveNotification } = require('../utils/notificationHelper'); // Adjust the path as necessary
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinary');
const Notification = require('../models/Notification');

// Email configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'khanbasha7777777@gmail.com',
        pass: 'hpdi qrqk plrn blzz'
    }
});

const sendEmailToDevelopers = async (developerEmails, projectDetails) => {
  // Creating a string with all related document links formatted as a list
  const relatedDocsLinks = projectDetails.relatedDocs.map((doc, index) => `${index + 1}: ${doc}`).join("\n");

  const mailOptions = {
      from: 'khanbasha7777777@gmail.com',
      to: developerEmails.join(", "), // Sending email to multiple recipients
      subject: `Assigned to a New Project: ${projectDetails.title}`,
      text: `You have been assigned to a new project: ${projectDetails.title}
Description: ${projectDetails.description}
Deadline: ${projectDetails.deadline.toDateString()}
Related Documents: 
${relatedDocsLinks}` // Adding related documents links to the email body
  };

  transporter.sendMail(mailOptions, function(error, info){
      if (error) {
          console.log('Error sending email:', error);
      } else {
          console.log('Email sent: ' + info.response);
      }
  });
};

//user management apis
const registerAdmin = async (req, res) => {
  try {
    const { username, password, email } = req.body;
    const hashedPassword = await bcrypt.hash(password, 8);
    const newAdmin = new Admin({
      username,
      email,
      password: hashedPassword
    });
    await newAdmin.save();
    res.status(201).json({ message: 'Admin registered successfully', admin: newAdmin });
  } catch (error) {
    res.status(500).json({ message: 'Error registering admin', error });
  }
};

const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: admin._id, username: admin.username }, process.env.JWT_SECRET, { expiresIn: '1d' });
    
    // Send the admin's _id explicitly in the response
    res.status(200).json({ 
      message: 'Admin logged in', 
      token, 
      _id: admin._id,
      role: 'admin',
      admin: {
        ...admin.toObject(),
        password: undefined
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Login error', error });
  }
};

const getAdminProfile = async (req, res) => {
  try {
    const adminid = req.admin.id;
    const admin = await Admin.findById(adminid);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    res.status(200).json(admin);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching admin profile', error });
  }
};

const updateAdminProfile = async (req, res) => {
  try {
    const adminId = req.admin.id;
    const updates = { ...req.body };
    
    // Get the current admin document
    const currentAdmin = await Admin.findById(adminId);
    if (!currentAdmin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    // Handle profile image upload
    if (req.files && req.files.profileImage) {
      const file = req.files.profileImage;
      const result = await uploadToCloudinary(file.tempFilePath, {
        folder: 'admin-profiles',
        resource_type: 'auto'
      });
      updates.profileImage = result.secure_url;

      // Delete old profile image if it exists
      if (currentAdmin.profileImage) {
        const publicId = currentAdmin.profileImage.split('/').slice(-2).join('/').split('.')[0];
        await deleteFromCloudinary(publicId);
      }
    }

    // Handle company logo upload
    if (req.files && req.files.companyLogo) {
      const file = req.files.companyLogo;
      const result = await uploadToCloudinary(file.tempFilePath, {
        folder: 'company-logos',
        resource_type: 'auto'
      });

      // Merge existing company details with new logo
      updates.companyDetails = {
        ...currentAdmin.companyDetails?.toObject(), // Convert to plain object if it's a Mongoose document
        ...updates.companyDetails, // Merge any new company details from the request
        logo: result.secure_url // Add the new logo URL
      };

      // Delete old company logo if it exists
      if (currentAdmin.companyDetails?.logo) {
        const publicId = currentAdmin.companyDetails.logo.split('/').slice(-2).join('/').split('.')[0];
        await deleteFromCloudinary(publicId);
      }
    } else if (updates.companyDetails) {
      // If updating company details without logo, preserve the existing logo
      updates.companyDetails = {
        ...currentAdmin.companyDetails?.toObject(), // Keep existing details including logo
        ...updates.companyDetails // Merge new details
      };
    }

    // Update the admin document
    const admin = await Admin.findByIdAndUpdate(
      adminId,
      { $set: updates },
      { new: true, runValidators: true }
    );

    res.status(200).json({ 
      message: 'Admin profile updated successfully', 
      admin 
    });

  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ 
      message: 'Error updating admin profile', 
      error: error.message 
    });
  }
};

const deleteAdmin = async (req, res) => {
  try {
    const adminid = req.admin.id;
    const admin = await Admin.findByIdAndDelete(adminid);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    res.status(200).json({ message: 'Admin deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting admin', error });
  }
};


// Operations on Developers and Managers
const getAllDevelopers = async (req, res) => {
  const developers = await Developer.find({});
  res.status(200).json(developers);
};

const getAllManagers = async (req, res) => {
  const managers = await Manager.find({});
  res.status(200).json(managers);
};

const deleteDeveloper = async (req, res) => {
  const deletedDeveloper = await Developer.findByIdAndDelete(req.params.developerId);
  if (!deletedDeveloper) {
    return res.status(404).json({ message: 'Developer not found' });
  }
  res.status(200).json({ message: 'Developer deleted successfully' });
};

const deleteManager = async (req, res) => {
  const deletedManager = await Manager.findByIdAndDelete(req.params.managerId);
  if (!deletedManager) {
    return res.status(404).json({ message: 'Manager not found' });
  }
  res.status(200).json({ message: 'Manager deleted successfully' });
};

const updateDeveloper = async (req, res) => {
  const updatedDeveloper = await Developer.findByIdAndUpdate(req.params.developerId, req.body, { new: true });
  if (!updatedDeveloper) {
    return res.status(404).json({ message: 'Developer not found' });
  }
  res.status(200).json({ message: 'Developer updated successfully', updatedDeveloper });
};

const updateManager = async (req, res) => {
  const updatedManager = await Manager.findByIdAndUpdate(req.params.managerId, req.body, { new: true });
  if (!updatedManager) {
    return res.status(404).json({ message: 'Manager not found' });
  }
  res.status(200).json({ message: 'Manager updated successfully', updatedManager });
};

const verifyDeveloper = async (req, res) => {
  const developer = await Developer.findByIdAndUpdate(req.params.developerId, { verified: 'yes' }, { new: true });
  if (!developer) {
    return res.status(404).json({ message: 'Developer not found' });
  }
  res.status(200).json({ message: 'Developer verified', developer });
};

const  getNonVerifiedDevelopers = async (req, res) => {
  try {
    const nonVerifiedDevelopers = await Developer.find({ verified: 'no' });
    if (!nonVerifiedDevelopers.length) {
      return res.status(404).json({ message: 'No non-verified developers found' });
    }
    res.status(200).json(nonVerifiedDevelopers);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching non-verified developers', error });
  }
};

//project management apis



// Add these functions after the existing ones

const initiatePasswordReset = async (req, res) => {
  try {
    const { email } = req.body;
    const admin = await Admin.findOne({ email });
    
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Set OTP expiration to 10 minutes from now
    const otpExpiration = new Date();
    otpExpiration.setMinutes(otpExpiration.getMinutes() + 10);

    // Save OTP to admin document
    admin.resetPasswordOTP = {
      code: otp,
      expiresAt: otpExpiration
    };
    await admin.save();

    // Send OTP via email
    const mailOptions = {
      from: 'khanbasha7777777@gmail.com',
      to: email,
      subject: 'Password Reset OTP',
      text: `Your OTP for password reset is: ${otp}\nThis OTP will expire in 10 minutes.`
    };

    transporter.sendMail(mailOptions, function(error, info) {
      if (error) {
        console.log('Error sending email:', error);
      } else {
        console.log('Email sent:', info.response);
      }
    });

    res.status(200).json({ 
      message: 'OTP has been sent to your email',
      email: email
    });

  } catch (error) {
    res.status(500).json({ 
      message: 'Error initiating password reset', 
      error: error.message 
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const admin = await Admin.findOne({ email });

    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    // Verify OTP
    if (!admin.resetPasswordOTP || 
        admin.resetPasswordOTP.code !== otp || 
        new Date() > admin.resetPasswordOTP.expiresAt) {
      return res.status(400).json({ 
        message: 'Invalid or expired OTP' 
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 8);
    
    // Update password and clear OTP
    admin.password = hashedPassword;
    admin.resetPasswordOTP = undefined;
    await admin.save();

    res.status(200).json({ 
      message: 'Password reset successful' 
    });

  } catch (error) {
    res.status(500).json({ 
      message: 'Error resetting password', 
      error: error.message 
    });
  }
};

// Add this new controller function
const updateAdminMedia = async (req, res) => {
  try {
    const adminId = req.admin.id;
    const files = req.files; // multer provides files as an object
    const updates = {};

    // Check if any files were uploaded
    if (files) {
      // Handle profile image
      if (files.profileImage) {
        const profileImage = files.profileImage[0]; // Get the first file from profileImage array
        const result = await uploadToCloudinary(profileImage.path, 'admin-profiles');
        updates.profileImage = result.secure_url;

        // Delete old profile image if exists
        const oldAdmin = await Admin.findById(adminId);
        if (oldAdmin.profileImage) {
          const publicId = oldAdmin.profileImage.split('/').slice(-2).join('/').split('.')[0];
          await deleteFromCloudinary(publicId);
        }
      }

      // Handle company logo
      if (files.companyLogo) {
        const companyLogo = files.companyLogo[0]; // Get the first file from companyLogo array
        const result = await uploadToCloudinary(companyLogo.path, 'company-logos');
        
        // Initialize companyDetails if it doesn't exist
        updates.companyDetails = updates.companyDetails || {};
        updates.companyDetails.logo = result.secure_url;

        // Delete old company logo if exists
        const oldAdmin = await Admin.findById(adminId);
        if (oldAdmin.companyDetails?.logo) {
          const publicId = oldAdmin.companyDetails.logo.split('/').slice(-2).join('/').split('.')[0];
          await deleteFromCloudinary(publicId);
        }
      }

      // Update admin document
      const admin = await Admin.findByIdAndUpdate(
        adminId,
        { $set: updates },
        { new: true }
      );

      if (!admin) {
        return res.status(404).json({ message: 'Admin not found' });
      }

      res.status(200).json({
        message: 'Media files updated successfully',
        admin
      });
    } else {
      res.status(400).json({ message: 'No files uploaded' });
    }
  } catch (error) {
    console.error('Media update error:', error);
    res.status(500).json({
      message: 'Error updating media files',
      error: error.message
    });
  }
};

// Get all notifications with null recipients
const getAllNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({
      $or: [
        { recipient: null },
        { type: 'holiday' }
      ]
    }).sort({ date: -1 });

    res.status(200).json({
      success: true,
      notifications
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching notifications',
      error: error.message
    });
  }
};

// Mark notification as read
const markNotificationAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;

    const notification = await Notification.findByIdAndUpdate(
      notificationId,
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      notification
    });

  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking notification as read',
      error: error.message
    });
  }
};

// Mark all notifications as read
const markAllNotificationsAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: null, read: false },
      { read: true }
    );

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read'
    });

  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({
      success: false, 
      message: 'Error marking all notifications as read',
      error: error.message
    });
  }
};
// Get all admins
const getAllAdmins = async (req, res) => {
  try {
    const admins = await Admin.find({}, {
      password: 0,
      resetPasswordOTP: 0
    });

    res.status(200).json({
      admins
    });

  } catch (error) {
    console.error('Error fetching admins:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching admins',
      error: error.message
    });
  }
};

// Export all functions
module.exports = {
 
  sendEmailToDevelopers,
  getNonVerifiedDevelopers,
  registerAdmin,
  adminLogin,
  getAdminProfile,
  updateAdminProfile,
  deleteAdmin,
  getAllDevelopers,
  getAllManagers,
  deleteDeveloper,
  deleteManager,
  updateDeveloper,
  updateManager,
  verifyDeveloper,
  initiatePasswordReset,
  resetPassword,
  updateAdminMedia,
  getAllNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getAllAdmins
};