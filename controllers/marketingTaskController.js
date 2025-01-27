const nodemailer = require('nodemailer');
const MarketingTask = require('../models/marketingTask');
const Project = require('../models/Project');
const Notification = require('../models/Notification');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinary');

// Email configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'khanbasha7777777@gmail.com',
        pass: 'hpdi qrqk plrn blzz'
    }
});

// Function to send email notification to assignees
const sendEmailToAssignees = async (assignees, taskDetails) => {
    try {
        // Get all assignees' details from both models
        const assigneePromises = assignees.map(async (assignee) => {
            const Model = assignee.role === 'DigitalMarketingRole' 
                ? require('../models/digitalMarketingRole')
                : require('../models/contentCreator');
            
            return await Model.findById(assignee.id);
        });

        const assigneeDetails = await Promise.all(assigneePromises);
        const emails = assigneeDetails
            .filter(assignee => assignee && assignee.email)
            .map(assignee => assignee.email);

        if (emails.length === 0) {
            console.log('No valid email recipients found');
            return;
        }

        const mailOptions = {
            from: 'khanbasha7777777@gmail.com',
            to: emails.join(', '),
            subject: `New Marketing Task Assigned: ${taskDetails.taskName}`,
            text: `You have been assigned a new marketing task: ${taskDetails.taskName}\nDescription: ${taskDetails.taskDescription}\nStart Date: ${taskDetails.startDate}\nEnd Date: ${taskDetails.endDate}`
        };

        const result = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully:', result.response);

    } catch (error) {
        console.error('Error sending email:', error);
        // Don't throw the error to prevent task creation from failing
    }
};

// Create new marketing task
const createMarketingTask = async (req, res) => {
    try {
        const { taskName, taskDescription, projectId, priority, startDate, endDate, status } = req.body;
        
        // Parse assignedTo from JSON string
        const assignedTo = JSON.parse(req.body.assignedTo);
        
        // Get creator info based on user type
        let createdBy;
        if (req.admin) {
            createdBy = req.admin._id;
        } else if (req.manager) {
            createdBy = req.manager._id;
        } else {
            return res.status(403).json({ message: 'Only admins and managers can create tasks' });
        }

        const files = req.files;
        let relatedDocs = [];

        // Handle file uploads
        if (files && files.relatedDocs) {
            for (const file of files.relatedDocs) {
                const result = await uploadToCloudinary(file.path, 'marketing-task-documents');
                relatedDocs.push(result.secure_url);
            }
        }

        const newMarketingTask = new MarketingTask({
            taskName,
            taskDescription,
            projectId,
            assignedTo,
            priority,
            startDate,
            endDate,
            status,
            createdBy,
            relatedDocs
        });

        await newMarketingTask.save();

        // Send email notifications
        await sendEmailToAssignees(assignedTo, {
            taskName,
            taskDescription,
            startDate,
            endDate
        });

        // Create notifications for assignees
        for (const assignee of assignedTo) {
            const notification = new Notification({
                recipient: assignee.id,
                content: `New Marketing Task assigned: ${taskName}`,
                type: 'MarketingTask',
                relatedId: newMarketingTask._id
            });
            await notification.save();
        }

        res.status(201).json({
            message: 'Marketing task created successfully',
            task: newMarketingTask
        });

    } catch (error) {
        console.error('Failed to create marketing task:', error);
        res.status(500).json({
            message: 'Error creating marketing task',
            error: error.message
        });
    }
};

// Update marketing task
const updateMarketingTask = async (req, res) => {
    try {
        const taskId = req.params.taskId;
        const updates = { ...req.body };
        
        // Parse assignedTo from JSON string if it exists
        if (updates.assignedTo) {
            updates.assignedTo = JSON.parse(updates.assignedTo);
        }

        const files = req.files;

        // Handle file uploads
        if (files && files.relatedDocs) {
            const task = await MarketingTask.findById(taskId);
            // Delete existing docs from cloudinary
            if (task.relatedDocs.length > 0) {
                for (const docUrl of task.relatedDocs) {
                    const publicId = docUrl.split('/').slice(-2).join('/').split('.')[0];
                    await deleteFromCloudinary(publicId);
                }
            }
            
            // Upload new docs
            updates.relatedDocs = [];
            for (const file of files.relatedDocs) {
                const result = await uploadToCloudinary(file.path, 'marketing-task-documents');
                updates.relatedDocs.push(result.secure_url);
            }
        }

        const updatedTask = await MarketingTask.findByIdAndUpdate(
            taskId,
            { $set: updates },
            { new: true, runValidators: true }
        );

        // Create notifications for assignees
        for (const assignee of updatedTask.assignedTo) {
            const notification = new Notification({
                recipient: assignee.id,
                content: `Marketing Task updated: ${updatedTask.taskName}`,
                type: 'MarketingTask',
                relatedId: updatedTask._id
            });
            await notification.save();
        }

        res.status(200).json({
            message: 'Marketing task updated successfully',
            task: updatedTask
        });

    } catch (error) {
        console.error('Failed to update marketing task:', error);
        res.status(500).json({
            message: 'Error updating marketing task',
            error: error.message
        });
    }
};

// Get all marketing tasks
const getAllMarketingTasks = async (req, res) => {
    try {
        const tasks = await MarketingTask.find()
            .populate('projectId')
            .populate('createdBy', 'username email');

        // Manually populate assignedTo data
        const populatedTasks = await Promise.all(tasks.map(async (task) => {
            const taskObject = task.toObject();
            
            // Populate assignedTo details
            taskObject.assignedTo = await Promise.all(taskObject.assignedTo.map(async (assignee) => {
                const Model = assignee.role === 'DigitalMarketingRole' 
                    ? require('../models/digitalMarketingRole')
                    : require('../models/contentCreator');
                
                const userDetails = await Model.findById(assignee.id)
                    .select('username email skills image');
                
                return {
                    ...assignee,
                    userDetails
                };
            }));

            return taskObject;
        }));

        res.status(200).json(populatedTasks);
    } catch (error) {
        console.error('Failed to fetch marketing tasks:', error);
        res.status(500).json({ 
            message: 'Error fetching marketing tasks', 
            error: error.message 
        });
    }
};

// Get marketing task by ID
const getMarketingTaskById = async (req, res) => {
    try {
        const taskId = req.params.taskId;
        const task = await MarketingTask.findById(taskId)
            .populate('projectId')
            .populate('createdBy', 'username email');

        if (!task) {
            return res.status(404).json({ message: 'Marketing task not found' });
        }

        const taskObject = task.toObject();

        // Populate assignedTo details
        taskObject.assignedTo = await Promise.all(taskObject.assignedTo.map(async (assignee) => {
            const Model = assignee.role === 'DigitalMarketingRole' 
                ? require('../models/digitalMarketingRole')
                : require('../models/contentCreator');
            
            const userDetails = await Model.findById(assignee.id)
                .select('username email skills image');
            
            return {
                ...assignee,
                userDetails
            };
        }));

        res.status(200).json(taskObject);
    } catch (error) {
        console.error('Failed to fetch marketing task:', error);
        res.status(500).json({ 
            message: 'Error fetching marketing task', 
            error: error.message 
        });
    }
};

// Get marketing tasks by project
const getMarketingTasksByProject = async (req, res) => {
    try {
        const projectId = req.params.projectId;
        const tasks = await MarketingTask.find({ projectId })
            .populate('assignedTo.id', 'username email')
            .populate('createdBy', 'username');

        res.status(200).json(tasks);
    } catch (error) {
        console.error('Failed to fetch project marketing tasks:', error);
        res.status(500).json({ 
            message: 'Error fetching project marketing tasks', 
            error: error.message 
        });
    }
};

// Delete marketing task
const deleteMarketingTask = async (req, res) => {
    try {
        const taskId = req.params.taskId;
        const task = await MarketingTask.findById(taskId);

        if (!task) {
            return res.status(404).json({ message: 'Marketing task not found' });
        }

        // Delete associated documents from Cloudinary
        if (task.relatedDocs && task.relatedDocs.length > 0) {
            for (const docUrl of task.relatedDocs) {
                const publicId = docUrl.split('/').slice(-2).join('/').split('.')[0];
                await deleteFromCloudinary(publicId);
            }
        }

        // Create notifications for assignees about task deletion
        for (const assignee of task.assignedTo) {
            const notification = new Notification({
                recipient: assignee.id,
                content: `Marketing Task deleted: ${task.taskName}`,
                type: 'MarketingTask',
                relatedId: task._id
            });
            await notification.save();
        }

        await MarketingTask.findByIdAndDelete(taskId);

        res.status(200).json({ message: 'Marketing task deleted successfully' });
    } catch (error) {
        console.error('Failed to delete marketing task:', error);
        res.status(500).json({ 
            message: 'Error deleting marketing task', 
            error: error.message 
        });
    }
};

// Update leads count
const updateLeadsCount = async (req, res) => {
    try {
        const taskId = req.params.taskId;
        const { leads } = req.body;

        const task = await MarketingTask.findByIdAndUpdate(
            taskId,
            { $set: { leads } },
            { new: true, runValidators: true }
        );

        if (!task) {
            return res.status(404).json({ message: 'Marketing task not found' });
        }

        // Create notification for task creator
        const notification = new Notification({
            recipient: task.createdBy,
            content: `Leads updated for task: ${task.taskName}. New leads count: ${leads}`,
            type: 'MarketingTask',
            relatedId: task._id
        });
        await notification.save();

        res.status(200).json({
            message: 'Leads count updated successfully',
            task
        });
    } catch (error) {
        console.error('Failed to update leads count:', error);
        res.status(500).json({ 
            message: 'Error updating leads count', 
            error: error.message 
        });
    }
};

// Get marketing tasks assigned to logged-in user
const getAssignedMarketingTasks = async (req, res) => {
    try {
        // Determine user ID based on authentication type
        let userId;
        if (req.marketingUser) {
            userId = req.marketingUser._id;
        } else if (req.contentCreator) {
            userId = req.contentCreator._id;
        } else {
            return res.status(401).json({ message: 'User not authenticated' });
        }

        const tasks = await MarketingTask.find({
            'assignedTo.id': userId
        })
        .populate({
            path: 'projectId',
            select: 'title description deadline status relatedDocs createdBy lastUpdatedBy',
            populate: {
                path: 'assignedTo createdBy lastUpdatedBy',
                select: 'username email'
            }
        })
        .populate('assignedTo.id', 'username email skills image')
        .populate('createdBy', 'username email')
        .sort({ createdAt: -1 });

        // Log for debugging
        console.log('User ID:', userId);
        console.log('Tasks found:', tasks.length);

        res.status(200).json({
            success: true,
            count: tasks.length,
            tasks
        });
    } catch (error) {
        console.error('Failed to fetch assigned marketing tasks:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error fetching assigned marketing tasks', 
            error: error.message 
        });
    }
};

// Get tasks by user ID
const getTasksByUserId = async (req, res) => {
    try {
        const { userId } = req.params;

        const tasks = await MarketingTask.find({
            'assignedTo': {
                $elemMatch: {
                    'id': userId
                }
            }
        })
        .populate({
            path: 'projectId',
            select: 'title description deadline status relatedDocs'
        })
        .populate('createdBy', 'username email')
        .populate({
            path: 'assignedTo.id',
            select: 'username email skills image'
        })
        .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: tasks.length,
            tasks
        });

    } catch (error) {
        console.error('Failed to fetch user tasks:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching user tasks',
            error: error.message
        });
    }
};

module.exports = {
    createMarketingTask,
    updateMarketingTask,
    getAllMarketingTasks,
    getMarketingTaskById,
    getMarketingTasksByProject,
    deleteMarketingTask,
    updateLeadsCount,
    getAssignedMarketingTasks,
    getTasksByUserId
};
