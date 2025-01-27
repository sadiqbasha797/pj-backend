const Manager = require('../models/Manager');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Developer = require('../models/Developer');
const Project = require('../models/Project');
const nodemailer = require('nodemailer');
const Holiday = require('../models/Holiday');
const CalendarEvent = require('../models/calendarEvent');
const Notification = require('../models/Notification');
const { createNotification,notifyCreation,notifyUpdate,leaveUpdateNotification,leaveNotification } = require('../utils/notificationHelper'); // Adjust the path as necessary
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinary');
const DigitalMarketingRole = require('../models/digitalMarketingRole');
const ContentCreator = require('../models/contentCreator');

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

const registerManager = async (req, res) => {
  try {
    const { 
      username, 
      password, 
      email, 
      developers = [], 
      digitalMarketingRoles = [], 
      contentCreators = [] 
    } = req.body;

    const hashedPassword = await bcrypt.hash(password, 8);

    // Calculate initial team size
    const totalTeamSize = developers.length + digitalMarketingRoles.length + contentCreators.length;

    // Process developers
    const processedDevelopers = await Promise.all(developers.map(async (devId) => {
      const developer = await Developer.findById(devId);
      if (developer) {
        return {
          developerId: developer._id,
          developerName: developer.username,
          assignedOn: new Date()
        };
      }
    })).then(results => results.filter(Boolean));

    // Process digital marketing roles
    const processedMarketingRoles = await Promise.all(digitalMarketingRoles.map(async (roleId) => {
      const role = await DigitalMarketingRole.findById(roleId);
      if (role) {
        return {
          roleId: role._id,
          roleName: role.name,
          assignedOn: new Date()
        };
      }
    })).then(results => results.filter(Boolean));

    // Process content creators
    const processedContentCreators = await Promise.all(contentCreators.map(async (creatorId) => {
      const creator = await ContentCreator.findById(creatorId);
      if (creator) {
        return {
          roleId: creator._id,
          roleName: creator.name,
          assignedOn: new Date()
        };
      }
    })).then(results => results.filter(Boolean));

    const newManager = new Manager({
      username,
      email,
      password: hashedPassword,
      teamSize: totalTeamSize,
      developers: processedDevelopers,
      digitalMarketingRoles: processedMarketingRoles,
      contentCreators: processedContentCreators
    });

    await newManager.save();
    res.status(201).json({ 
      message: 'Manager registered successfully', 
      manager: newManager 
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      message: 'Error registering manager', 
      error: error.message 
    });
  }
};

const managerLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const manager = await Manager.findOne({ email });
    if (!manager) {
      return res.status(404).json({ message: 'Manager not found' });
    }
    const isMatch = await bcrypt.compare(password, manager.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: manager._id, username: manager.username, role: manager.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.status(200).json({ message: 'Manager logged in', token, manager });
  } catch (error) {
    res.status(500).json({ message: 'Login error', error });
  }
};

const getManagerProfile = async (req, res) => {
  try {
    const managerId = req.manager.id;
    const manager = await Manager.findById(managerId);
    if (!manager) {
      return res.status(404).json({ message: 'Manager not found' });
    }
    res.status(200).json(manager);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching manager profile', error });
  }
};

const updateManagerProfile = async (req, res) => {
  try {
    const managerId = req.manager.id;
    const updates = req.body;

    // If developers array is being updated
    if (updates.developers && updates.developers.length > 0) {
      const existingManager = await Manager.findById(managerId);
      
      for (const dev of updates.developers) {
        const developerId = dev.developerId;
        
        // Check if developer already exists in the team
        const isDeveloperAssigned = existingManager.developers.some(
          d => d.developerId.toString() === developerId
        );

        if (isDeveloperAssigned) {
          continue; // Skip if already assigned
        }

        // Find developer details
        const developer = await Developer.findById(developerId);
        if (!developer) {
          continue; // Skip if developer not found
        }

        // Add developer to the team
        existingManager.developers.push({
          developerId: developer._id,
          developerName: developer.username,
          assignedOn: new Date()
        });
      }

      // Update team size
      existingManager.teamSize = existingManager.developers.length;
      
      // Save the updated manager
      const updatedManager = await existingManager.save();
      
      return res.status(200).json({
        message: 'Team updated successfully',
        manager: updatedManager
      });
    }

    // For single developer addition (backward compatibility)
    if (updates.developerId) {
      const developer = await Developer.findById(updates.developerId);
      if (!developer) {
        return res.status(404).json({ message: 'Developer not found' });
      }

      const existingManager = await Manager.findById(managerId);
      const isDeveloperAssigned = existingManager.developers.some(
        dev => dev.developerId.toString() === updates.developerId
      );

      if (isDeveloperAssigned) {
        return res.status(400).json({
          message: 'Developer is already assigned to this team'
        });
      }

      existingManager.developers.push({
        developerId: developer._id,
        developerName: developer.username,
        assignedOn: new Date()
      });

      existingManager.teamSize = existingManager.developers.length;
      const updatedManager = await existingManager.save();

      return res.status(200).json({
        message: 'Developer added to team successfully',
        manager: updatedManager
      });
    }

    // For other profile updates
    const updatedManager = await Manager.findByIdAndUpdate(
      managerId,
      { $set: updates },
      { new: true }
    );

    if (!updatedManager) {
      return res.status(404).json({ message: 'Manager not found' });
    }

    res.status(200).json({
      message: 'Manager profile updated',
      manager: updatedManager
    });

  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({
      message: 'Error updating manager profile',
      error: error.message
    });
  }
};

const deleteDeveloper = async (req, res) => {
  try {
    const developerId = req.params.developerId;
    const deletedDeveloper = await Developer.findByIdAndDelete(developerId);
    if (!deletedDeveloper) {
      return res.status(404).json({ message: 'Developer not found' });
    }
    res.status(200).json({ message: 'Developer deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting developer', error });
  }
};

const verifyDeveloper = async (req, res) => {
  try {
    const developerId = req.params.developerId;
    const developer = await Developer.findByIdAndUpdate(developerId, { verified: 'yes' }, { new: true });
    if (!developer) {
      return res.status(404).json({ message: 'Developer not found' });
    }
    res.status(200).json({ message: 'Developer verified successfully', developer });
  } catch (error) {
    res.status(500).json({ message: 'Error verifying developer', error });
  }
};

const getAllDevelopers = async (req, res) => {
  try {
    const developers = await Developer.find({});  // Fetch all developer documents
    res.status(200).json(developers);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching developers', error });
  }
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

const updateManagerMedia = async (req, res) => {
  try {
    const managerId = req.manager.id;
    const files = req.files;
    const updates = {};

    if (files) {
      // Handle profile image
      if (files.profileImage) {
        const profileImage = files.profileImage[0];
        const result = await uploadToCloudinary(profileImage.path, 'manager-profiles');
        updates.image = result.secure_url;

        // Delete old profile image if exists
        const oldManager = await Manager.findById(managerId);
        if (oldManager.image) {
          const publicId = oldManager.image.split('/').slice(-2).join('/').split('.')[0];
          await deleteFromCloudinary(publicId);
        }
      }

      // Update manager document
      const manager = await Manager.findByIdAndUpdate(
        managerId,
        { $set: updates },
        { new: true }
      );

      if (!manager) {
        return res.status(404).json({ message: 'Manager not found' });
      }

      res.status(200).json({
        message: 'Media files updated successfully',
        manager
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
const getManagerNotifications = async (req, res) => {
  try {
    const managerId = req.manager.id;

    const notifications = await Notification.find({
      recipient: managerId
    })
    .sort({ date: -1 }); // Sort by date descending (newest first)

    res.status(200).json({
      message: 'Notifications fetched successfully',
      notifications
    });

  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      message: 'Error fetching notifications',
      error: error.message
    });
  }
};

const markAllNotificationsAsRead = async (req, res) => {
  try {
    const managerId = req.manager.id;
    await Notification.updateMany({ recipient: managerId, read: false }, { read: true });
    res.status(200).json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Error marking all notifications as read', error: error.message });
  }
};

// Export all controller functions at the end
module.exports = {
  getNonVerifiedDevelopers,
  registerManager,
  verifyDeveloper,
  managerLogin,
  getManagerProfile,
  updateManagerProfile,
  getAllDevelopers,
  deleteDeveloper,
  updateManagerMedia,
  getManagerNotifications,
  markAllNotificationsAsRead
};