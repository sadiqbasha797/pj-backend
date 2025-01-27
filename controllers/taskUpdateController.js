const TaskUpdate = require('../models/taskUpdate');
const MarketingTask = require('../models/marketingTask');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinary');
const nodemailer = require('nodemailer');
const { createNotification, notifyUpdate } = require('../utils/notificationHelper');

// Email configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'khanbasha7777777@gmail.com',
        pass: 'hpdi qrqk plrn blzz'
    }
});

// Function to send email notification about task update
const sendTaskUpdateEmail = async (task, updateDetails) => {
    try {
        // Get creator's details (Admin)
        const Admin = require('../models/Admin');
        const creator = await Admin.findById(task.createdBy);
        
        if (!creator) {
            console.log('Creator not found');
            return;
        }

        // Get all assignees' details
        const assigneePromises = task.assignedTo.map(async (assignee) => {
            const Model = assignee.role === 'DigitalMarketingRole' 
                ? require('../models/digitalMarketingRole')
                : require('../models/contentCreator');
            
            return await Model.findById(assignee.id);
        });

        const assigneeDetails = await Promise.all(assigneePromises);
        
        // Combine all recipient emails (creator + assignees)
        const emails = [
            ...assigneeDetails.map(assignee => assignee.email),
            creator.email
        ].filter(Boolean); // Remove any null/undefined emails

        if (emails.length === 0) {
            console.log('No valid email recipients found');
            return;
        }

        // Format leads info for email
        const leadsInfoText = updateDetails.leadsInfo.length > 0 
            ? '\n\nNew Leads Information:\n' + updateDetails.leadsInfo.map(lead => 
                `- Name: ${lead.name}\n  Contact: ${lead.contact}\n  Description: ${lead.description}`
            ).join('\n')
            : '';

        // Format attachments info
        const attachmentsText = updateDetails.attachments?.length > 0
            ? '\n\nAttachments: ' + updateDetails.attachments.length + ' file(s) uploaded'
            : '';

        const mailOptions = {
            from: 'khanbasha7777777@gmail.com',
            to: emails.join(', '),
            subject: `Task Update: ${task.taskName}`,
            text: `A new update has been added to the task: ${task.taskName}

Update Details:
Description: ${updateDetails.description}
Period: ${new Date(updateDetails.startDate).toLocaleDateString()} to ${new Date(updateDetails.endDate).toLocaleDateString()}
Updated By: ${updateDetails.updatedBy.name}${leadsInfoText}${attachmentsText}

You can view the complete update in the system.`
        };

        const result = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully:', result.response);

    } catch (error) {
        console.error('Error sending email:', error);
        // Don't throw the error to prevent task update creation from failing
    }
};

// Create a new task update
const createTaskUpdate = async (req, res) => {
    try {
        const { taskId, description, startDate, endDate, leadsInfo } = req.body;
        const files = req.files;
        let attachments = [];

        // Get user info based on type
        let currentUserId, username;
        if (req.marketingUser) {
            currentUserId = req.marketingUser._id;
            username = req.marketingUser.username;
        } else if (req.contentCreator) {
            currentUserId = req.contentCreator._id;
            username = req.contentCreator.username;
        } else {
            return res.status(401).json({ message: 'User not authenticated' });
        }

        // Verify the task exists and populate assignedTo
        const task = await MarketingTask.findById(taskId);
        if (!task) {
            return res.status(404).json({ message: 'Marketing task not found' });
        }

        // Verify the user is assigned to the task
        const isAssigned = task.assignedTo.some(assignee => 
            assignee.id.toString() === currentUserId.toString()
        );

        if (!isAssigned) {
            return res.status(403).json({ message: 'You are not assigned to this task' });
        }

        // Handle file uploads to Cloudinary
        if (files && files.length > 0) {
            for (const file of files) {
                try {
                    const result = await uploadToCloudinary(file.path, 'task-updates');
                    attachments.push(result.secure_url);
                } catch (uploadError) {
                    console.error('Error uploading file to Cloudinary:', uploadError);
                }
            }
        }

        // Handle leadsInfo parsing
        let parsedLeadsInfo = [];
        if (leadsInfo) {
            try {
                parsedLeadsInfo = typeof leadsInfo === 'string' ? JSON.parse(leadsInfo) : leadsInfo;
            } catch (error) {
                console.error('Error parsing leadsInfo:', error);
                parsedLeadsInfo = [];
            }
        }

        const updatedBy = {
            id: currentUserId,
            name: username
        };

        const taskUpdate = new TaskUpdate({
            taskId,
            description,
            startDate,
            endDate,
            attachments,
            leadsInfo: parsedLeadsInfo,
            updatedBy,
            comments: []
        });

        await taskUpdate.save();

        // Send email notifications
        await sendTaskUpdateEmail(task, {
            description,
            startDate,
            endDate,
            leadsInfo: parsedLeadsInfo,
            updatedBy,
            attachments
        });

        // Create individual notifications for each assignee
        for (const assignee of task.assignedTo) {
            await createNotification(
                assignee.id,
                `New update for task: ${task.taskName}`,
                'task-update',
                taskUpdate._id
            );
        }

        // Create admin notification
        await createNotification(
            null,
            `New update for task: ${task.taskName}`,
            'task-update',
            taskUpdate._id
        );

        res.status(201).json({
            message: 'Task update created successfully',
            taskUpdate
        });

    } catch (error) {
        console.error('Error creating task update:', error);
        res.status(500).json({
            message: 'Error creating task update',
            error: error.message
        });
    }
};

// Get all updates for a specific task
const getTaskUpdates = async (req, res) => {
    try {
        const { taskId } = req.params;
        
        const updates = await TaskUpdate.find({ taskId })
            .populate({
                path: 'taskId',
                select: 'taskName taskDescription status priority'
            })
            .populate({
                path: 'comments.createdBy',
                select: 'username email'
            })
            .sort({ createdAt: -1 });

        if (!updates) {
            return res.status(404).json({ message: 'No updates found for this task' });
        }

        res.status(200).json(updates);

    } catch (error) {
        console.error('Error fetching task updates:', error);
        res.status(500).json({
            message: 'Error fetching task updates',
            error: error.message
        });
    }
};

// Get all updates for a specific project
const getProjectTaskUpdates = async (req, res) => {
    try {
        const { projectId } = req.params;
        
        // First, find all marketing tasks associated with the project
        const marketingTasks = await MarketingTask.find({ projectId });
        
        // Get task IDs
        const taskIds = marketingTasks.map(task => task._id);
        
        // Find all updates for these tasks
        const updates = await TaskUpdate.find({ taskId: { $in: taskIds } })
            .populate('taskId', 'taskName') // Optionally populate task details
            .sort({ createdAt: -1 });

        res.status(200).json(updates);

    } catch (error) {
        console.error('Error fetching project task updates:', error);
        res.status(500).json({
            message: 'Error fetching project task updates',
            error: error.message
        });
    }
};

// Add a comment to a task update
const addComment = async (req, res) => {
    try {
        const { updateId } = req.params;
        const { text } = req.body;
        
        // Determine the user type and get their ID, name, and role
        let userId, userName, userRole;
        if (req.admin) {
            userId = req.admin._id;
            userName = req.admin.username;
            userRole = 'admin';
        } else if (req.manager) {
            userId = req.manager._id;
            userName = req.manager.username;
            userRole = 'manager';
        } else if (req.client) {
            userId = req.client._id;
            userName = req.client.username;
            userRole = 'client';
        } else {
            return res.status(401).json({ message: 'User not authenticated' });
        }
        
        const taskUpdate = await TaskUpdate.findByIdAndUpdate(
            updateId,
            {
                $push: {
                    comments: {
                        text,
                        createdBy: userId,
                        name: userName,
                        role: userRole,
                        createdAt: new Date()
                    }
                }
            },
            { 
                new: true,
                populate: {
                    path: 'taskId',
                    select: 'taskName assignedTo'
                }
            }
        );

        if (!taskUpdate) {
            return res.status(404).json({ message: 'Task update not found' });
        }

        // Create individual notifications for each assignee
        if (taskUpdate.taskId && taskUpdate.taskId.assignedTo) {
            for (const assignee of taskUpdate.taskId.assignedTo) {
                await createNotification(
                    assignee.id,
                    `New comment by ${userName} (${userRole}) on task update for: ${taskUpdate.taskId.taskName}`,
                    'task-comment',
                    updateId
                );
            }
        }

        // Create admin notification if the commenter is not an admin
        if (userRole !== 'admin') {
            await createNotification(
                null,
                `New comment by ${userName} (${userRole}) on task update for: ${taskUpdate.taskId.taskName}`,
                'task-comment',
                updateId
            );
        }

        res.status(200).json({
            message: 'Comment added successfully',
            taskUpdate
        });

    } catch (error) {
        console.error('Error adding comment:', error);
        res.status(500).json({
            message: 'Error adding comment',
            error: error.message
        });
    }
};

// Delete a task update
const deleteTaskUpdate = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Get user info based on type
        let userId;
        if (req.marketingUser) {
            userId = req.marketingUser._id;
        } else if (req.contentCreator) {
            userId = req.contentCreator._id;
        } else {
            return res.status(401).json({ message: 'User not authenticated' });
        }

        const taskUpdate = await TaskUpdate.findById(id).populate('taskId');
        
        if (!taskUpdate) {
            return res.status(404).json({ message: 'Task update not found' });
        }

        // Verify the user is the creator of the update
        if (taskUpdate.updatedBy.id.toString() !== userId.toString()) {
            return res.status(403).json({ message: 'Not authorized to delete this update' });
        }

        // Delete attachments from Cloudinary
        if (taskUpdate.attachments.length > 0) {
            for (const attachment of taskUpdate.attachments) {
                const publicId = attachment.split('/').slice(-2).join('/').split('.')[0];
                await deleteFromCloudinary(publicId);
            }
        }

        await TaskUpdate.findByIdAndDelete(id);

        // Create individual notifications for each assignee
        for (const assignee of taskUpdate.taskId.assignedTo) {
            await createNotification(
                assignee.id,
                `Task update deleted for: ${taskUpdate.taskId.taskName}`,
                'task-update-deleted',
                taskUpdate.taskId._id
            );
        }

        // Create admin notification
        await createNotification(
            null,
            `Task update deleted for: ${taskUpdate.taskId.taskName}`,
            'task-update-deleted',
            taskUpdate.taskId._id
        );

        res.status(200).json({
            message: 'Task update deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting task update:', error);
        res.status(500).json({
            message: 'Error deleting task update',
            error: error.message
        });
    }
};

// Update a task update
const updateTaskUpdate = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Get user info based on type
        let userId;
        if (req.marketingUser) {
            userId = req.marketingUser._id;
        } else if (req.contentCreator) {
            userId = req.contentCreator._id;
        } else {
            return res.status(401).json({ message: 'User not authenticated' });
        }

        const { description, leadsInfo } = req.body;
        const files = req.files;

        const taskUpdate = await TaskUpdate.findById(id).populate('taskId');
        
        if (!taskUpdate) {
            return res.status(404).json({ message: 'Task update not found' });
        }

        // Verify the user is the creator of the update
        if (taskUpdate.updatedBy.id.toString() !== userId.toString()) {
            return res.status(403).json({ message: 'Not authorized to modify this update' });
        }

        // Handle existing attachments deletion if needed
        if (req.body.removeAttachments) {
            const attachmentsToRemove = JSON.parse(req.body.removeAttachments);
            for (const attachment of attachmentsToRemove) {
                const publicId = attachment.split('/').slice(-2).join('/').split('.')[0];
                await deleteFromCloudinary(publicId);
            }
            taskUpdate.attachments = taskUpdate.attachments.filter(
                url => !attachmentsToRemove.includes(url)
            );
        }

        // Handle new file uploads
        if (files && files.length > 0) {
            for (const file of files) {
                try {
                    const result = await uploadToCloudinary(file.path, 'task-updates');
                    taskUpdate.attachments.push(result.secure_url);
                } catch (uploadError) {
                    console.error('Error uploading file to Cloudinary:', uploadError);
                }
            }
        }

        // Update other fields
        taskUpdate.description = description || taskUpdate.description;
        if (leadsInfo) {
            taskUpdate.leadsInfo = JSON.parse(leadsInfo);
        }

        await taskUpdate.save();

        // Create individual notifications for each assignee
        for (const assignee of taskUpdate.taskId.assignedTo) {
            await createNotification(
                assignee.id,
                `Task update modified for: ${taskUpdate.taskId.taskName}`,
                'task-update',
                id
            );
        }

        // Create admin notification
        await createNotification(
            null,
            `Task update modified for: ${taskUpdate.taskId.taskName}`,
            'task-update',
            id
        );

        res.status(200).json({
            message: 'Task update modified successfully',
            taskUpdate
        });

    } catch (error) {
        console.error('Error updating task update:', error);
        res.status(500).json({
            message: 'Error updating task update',
            error: error.message
        });
    }
};

const deleteComment = async (req, res) => {
    try {
        const { updateId, commentId } = req.params;

        // Determine the user type and get their ID, role
        let userId, userRole;
        if (req.admin) {
            userId = req.admin._id;
            userRole = 'admin';
        } else if (req.manager) {
            userId = req.manager._id;
            userRole = 'manager';
        } else if (req.client) {
            userId = req.client._id;
            userRole = 'client';
        } else {
            return res.status(401).json({ message: 'User not authenticated' });
        }

        // Find the task update and the specific comment
        const taskUpdate = await TaskUpdate.findById(updateId).populate('taskId');
        
        if (!taskUpdate) {
            return res.status(404).json({ message: 'Task update not found' });
        }

        // Find the comment
        const comment = taskUpdate.comments.id(commentId);
        
        if (!comment) {
            return res.status(404).json({ message: 'Comment not found' });
        }

        // Check if user has permission to delete the comment
        // Allow if user is admin or if user is the creator of the comment
        if (userRole !== 'admin' && comment.createdBy.toString() !== userId.toString()) {
            return res.status(403).json({ 
                message: 'Not authorized to delete this comment' 
            });
        }

        // Remove the comment
        const updatedTaskUpdate = await TaskUpdate.findByIdAndUpdate(
            updateId,
            {
                $pull: {
                    comments: { _id: commentId }
                }
            },
            { 
                new: true,
                populate: {
                    path: 'taskId',
                    select: 'taskName assignedTo'
                }
            }
        );

        // Create notifications for assignees
        if (updatedTaskUpdate.taskId && updatedTaskUpdate.taskId.assignedTo) {
            for (const assignee of updatedTaskUpdate.taskId.assignedTo) {
                await createNotification(
                    assignee.id,
                    `Comment deleted on task update for: ${updatedTaskUpdate.taskId.taskName}`,
                    'comment-deleted',
                    updateId
                );
            }
        }

        // Create admin notification if the action wasn't performed by an admin
        if (userRole !== 'admin') {
            await createNotification(
                null,
                `Comment deleted by ${userRole} on task update for: ${updatedTaskUpdate.taskId.taskName}`,
                'comment-deleted',
                updateId
            );
        }

        res.status(200).json({
            message: 'Comment deleted successfully',
            taskUpdate: updatedTaskUpdate
        });

    } catch (error) {
        console.error('Error deleting comment:', error);
        res.status(500).json({
            message: 'Error deleting comment',
            error: error.message
        });
    }
};

module.exports = {
    createTaskUpdate,
    getTaskUpdates,
    addComment,
    deleteTaskUpdate,
    updateTaskUpdate,
    getProjectTaskUpdates,
    deleteComment
};
