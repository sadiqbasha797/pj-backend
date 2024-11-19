const Admin = require('../models/Admin');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Developer = require('../models/Developer');
const Manager = require('../models/Manager');
const Project = require('../models/Project');
const nodemailer = require('nodemailer');
const CalendarEvent = require('../models/calendarEvent');
const Holiday = require('../models/Holiday');
const Notification = require('../models/Notification');
const { createNotification,notifyCreation,notifyUpdate,leaveUpdateNotification,leaveNotification } = require('../utils/notificationHelper'); // Adjust the path as necessary
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinary');
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

//project management apis
const addProject = async (req, res) => {
    try {
        let { title, description, deadline, assignedTo, status } = req.body;
        const userId = req.admin ? req.admin._id : req.manager._id;
        const onModel = req.admin ? 'Admin' : 'Manager';

        // Parse assignedTo if it's a JSON string
        if (typeof assignedTo === 'string') {
            try {
                assignedTo = JSON.parse(assignedTo);
            } catch (error) {
                console.error('Error parsing assignedTo:', error);
                return res.status(400).json({ message: 'Invalid assignedTo format' });
            }
        }

        // Ensure assignedTo is an array
        if (!Array.isArray(assignedTo)) {
            return res.status(400).json({ message: 'assignedTo must be an array' });
        }

        // Handle file uploads
        const uploadedDocs = [];
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const result = await uploadToCloudinary(file.path, 'projects');
                uploadedDocs.push(result.secure_url);
            }
        }

        const newProject = new Project({
            title,
            description,
            deadline,
            assignedTo,
            relatedDocs: uploadedDocs,
            status,
            createdBy: userId,
            lastUpdatedBy: userId,
            onModel: onModel  
        });
        await newProject.save();
  
        const participantObjects = assignedTo.map(id => ({
            participantId: id,
            onModel: 'Developer' 
        }));
  
        const newEvent = new CalendarEvent({
            title: `Project Assigned: ${title}`,
            description,
            eventDate: deadline,
            createdBy: userId,
            onModel: onModel,
            participants: participantObjects,
            eventType: 'Project Deadline',
            projectId: newProject._id
        });
        await newEvent.save();

        // Get all managers who manage any of the assigned developers
        const managers = await Manager.find({
            'developers.developerId': { $in: assignedTo }
        }).select('_id');
        const managerIds = managers.map(manager => manager._id);
  
        // Create individual notifications for each recipient
        const allRecipients = [...assignedTo, ...managerIds];
        for (const recipientId of allRecipients) {
            const notification = new Notification({
                recipient: recipientId,
                content: `New Project created: ${title}`,
                type: 'Project',
                relatedId: newProject._id
            });
            await notification.save();
        }
  
        const developerEmails = await Developer.find({ '_id': { $in: assignedTo } }).select('email');
        await sendEmailToDevelopers(developerEmails.map(dev => dev.email), newProject);
  
        res.status(201).json({ message: 'Project added successfully and event created', project: newProject });
    } catch (error) {
        console.error("Failed to add project or create event:", error);
        res.status(500).json({ message: 'Error adding project and creating event', error: error.message });
    }
};

  
  // Fetch all projects
  const fetchProjects = async (req, res) => {
    try {
      const projects = await Project.find({});
      res.status(200).json(projects);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching projects', error });
    }
  };

const updateProject = async (req, res) => {
  try {
    const projectId = req.params.projectId;
    const updates = req.body;
    const oldProject = await Project.findById(projectId);

    if (!oldProject) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Convert assignedTo back to array if it's a JSON string
    if (typeof updates.assignedTo === 'string') {
      updates.assignedTo = JSON.parse(updates.assignedTo);
    }

    // Handle file uploads if there are new files
    if (req.files && req.files.length > 0) {
      const uploadedDocs = [];
      
      // Upload new documents
      for (const file of req.files) {
        const result = await uploadToCloudinary(file.path, 'projects');
        uploadedDocs.push(result.secure_url);
      }
      
      // Combine new uploads with existing docs if needed
      updates.relatedDocs = uploadedDocs;
    }

    const updatedProject = await Project.findByIdAndUpdate(
      projectId, 
      updates,
      { new: true }
    );

    const updatedEvent = await CalendarEvent.findOneAndUpdate(
      { projectId: projectId },
      {
        title: `Project Assigned: ${updates.title || updatedProject.title}`,
        description: updates.description || updatedProject.description,
        eventDate: updates.deadline || updatedProject.deadline
      },
      { new: true }
    );

    if (!updatedEvent) {
      return res.status(404).json({ message: 'Related calendar event not found' });
    }

    // Get assigned developers
    const assignedTo = updatedProject.assignedTo;

    // Find all managers who manage any of the assigned developers
    const managers = await Manager.find({
      'developers.developerId': { $in: assignedTo }
    }).select('_id');
    const managerIds = managers.map(manager => manager._id);

    // Combine developer IDs and manager IDs for notifications
    const notificationRecipients = [...assignedTo, ...managerIds];

    // Create individual notifications for each recipient including null recipient
    // First create notification for specific recipients
    for (const recipientId of notificationRecipients) {
      const notification = new Notification({
        recipient: recipientId,
        content: `Project updated: ${updatedProject.title}`,
        read: false,
        relatedId: updatedProject._id,
        type: 'Project',
        date: new Date()
      });
      await notification.save();
    }

    // Create an additional notification with null recipient
    const nullNotification = new Notification({
      recipient: null,
      content: `Project updated: ${updatedProject.title}`,
      read: false,
      relatedId: updatedProject._id,
      type: 'Project',
      date: new Date()
    });
    await nullNotification.save();

    res.status(200).json({ 
      message: 'Project and related event updated successfully', 
      project: updatedProject, 
      event: updatedEvent 
    });
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ message: 'Error updating project and event', error });
  }
};
  
  const deleteProject = async (req, res) => {
    try {
      const projectId = req.params.projectId;
      
      const deletedProject = await Project.findById(projectId);
      if (!deletedProject) {
        return res.status(404).json({ message: 'Project not found' });
      }

      // Delete related documents from Cloudinary
      for (const docUrl of deletedProject.relatedDocs) {
        await deleteFromCloudinary(docUrl);
      }

      // Get assigned developers and their managers
      const assignedDevelopers = await Developer.find({ '_id': { $in: deletedProject.assignedTo } }).select('email');
      const managers = await Manager.find({
        'developers.developerId': { $in: deletedProject.assignedTo }
      }).select('email _id');

      const developerEmails = assignedDevelopers.map(dev => dev.email);
      const managerEmails = managers.map(manager => manager.email);
      const allEmails = [...developerEmails, ...managerEmails];

      // Send email notification about project deletion to both developers and managers
      const mailOptions = {
        from: 'khanbasha7777777@gmail.com',
        to: allEmails.join(", "),
        subject: `Project Deleted: ${deletedProject.title}`,
        text: `The project "${deletedProject.title}" has been deleted.
Project Details:
Title: ${deletedProject.title}
Description: ${deletedProject.description}

Note: For managers - This project involved developers under your management.`
      };

      transporter.sendMail(mailOptions, function(error, info) {
        if (error) {
          console.log('Error sending deletion email:', error);
        } else {
          console.log('Deletion email sent: ' + info.response);
        }
      });

      // Create notifications for developers and managers
      const notificationRecipients = [...deletedProject.assignedTo, ...managers.map(m => m._id)];
      for (const recipientId of notificationRecipients) {
        const notification = new Notification({
          recipient: recipientId,
          content: `Project deleted: ${deletedProject.title}`,
          read: false,
          type: 'Project',
          date: new Date()
        });
        await notification.save();
      }

      // Create notification with null recipient
      const nullNotification = new Notification({
        recipient: null,
        content: `Project deleted: ${deletedProject.title}`,
        read: false,
        type: 'Project',
        date: new Date()
      });
      await nullNotification.save();

      await Project.findByIdAndDelete(projectId);

      const deletedEvents = await CalendarEvent.deleteMany({ projectId: projectId });
      if (deletedEvents.deletedCount === 0) {
        return res.status(404).json({ message: 'No related calendar events found to delete' });
      }

      res.status(200).json({ message: 'Project, related calendar events, and documents deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Error deleting project, calendar events, and documents', error });
    }
  };
  
  // Fetch projects by status
  const getProjectsByStatus = async (req, res) => {
    try {
      const { status } = req.query;  
  
      if (!['Assigned', 'Started', 'In-Progress', 'Testing', 'Completed'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status value' });
      }
  
      const projects = await Project.find({ status: status });
      if (projects.length === 0) {
        return res.status(404).json({ message: 'No projects found with the given status' });
      }
      res.status(200).json(projects);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching projects', error });
    }
  };

  const getAssignedDevelopers = async (req, res) => {
    try {
      const projectId = req.params.projectId;

      const project = await Project.findById(projectId)
        .populate('assignedTo', 'username email skills') // Populate only necessary fields
        .select('assignedTo');

      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }

      res.status(200).json({
        message: 'Developers assigned to the project retrieved successfully',
        developers: project.assignedTo
      });
    } catch (error) {
      console.error('Error fetching assigned developers:', error);
      res.status(500).json({ message: 'Error fetching assigned developers', error: error.message });
    }
  };
  const getProjectById = async (req, res) => {
    try {
      const projectId = req.params.projectId;

      const project = await Project.findById(projectId)
        .populate('assignedTo', 'username email')
        .populate('createdBy', 'username email')
        .populate('lastUpdatedBy', 'username email');

      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }

      res.status(200).json({
        message: 'Project retrieved successfully',
        project: project
      });
    } catch (error) {
      console.error('Error fetching project:', error);
      res.status(500).json({ message: 'Error fetching project', error: error.message });
    }
  };

  module.exports={
    addProject,
    fetchProjects,
    updateProject,
    deleteProject,
    getProjectsByStatus,
    getAssignedDevelopers,
    getProjectById
  }
