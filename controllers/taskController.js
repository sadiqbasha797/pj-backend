const nodemailer = require('nodemailer');
const Task = require('../models/Task');
const Project = require('../models/Project');
const Developer = require('../models/Developer');
const { createNotification,notifyCreation,notifyUpdate,leaveUpdateNotification,leaveNotification } = require('../utils/notificationHelper'); // Adjust the path as necessary
const CalendarEvent = require('../models/calendarEvent');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinary');
const mongoose = require('mongoose');
const Notification = require('../models/Notification');

// Email configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'khanbasha7777777@gmail.com', // Replace with your email
        pass: 'hpdi qrqk plrn blzz' // Replace with your email password or app-specific password
    }
});

// Function to send email notification to participants
const sendEmailToParticipants = async (participantIds, taskDetails) => {
    const participants = await Developer.find({ '_id': { $in: participantIds } });
    const emails = participants.map(participant => participant.email);

    const mailOptions = {
        from: 'khanbasha7777777@gmail.com', // Replace with your email
        to: emails.join(', '),
        subject: `New Task Assigned: ${taskDetails.taskName}`,
        text: `You have been assigned a new task: ${taskDetails.taskName}\nDescription: ${taskDetails.description}\nStart Date: ${taskDetails.startDate}\nEnd Date: ${taskDetails.endDate}`
    };

    transporter.sendMail(mailOptions, function(error, info){
        if (error) {
            console.log('Error sending email:', error);
        } else {
            console.log('Email sent: ' + info.response);
        }
    });
};

const addTask = async (req, res) => {
    try {
        const { taskName, description, startDate, endDate, projectId, participants, status } = req.body;
        const createdBy = req.admin ? req.admin._id : req.manager._id;
        const files = req.files; // From multer
        let relatedDocuments = [];

        // Parse participants from string to object
        const parsedParticipants = JSON.parse(participants);

        // Handle file uploads
        if (files && files.length > 0) {
            for (const file of files) {
                const result = await uploadToCloudinary(file.path, 'task-documents');
                relatedDocuments.push(result.secure_url);
            }
        }

        // Ensure the project exists
        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        // Ensure participants are part of the project
        const validParticipants = parsedParticipants.every(p => 
            project.assignedTo.includes(p.participantId)
        );
        
        if (!validParticipants) {
            return res.status(400).json({ message: 'All participants must be part of the project' });
        }

        const newTask = new Task({
            taskName,
            description,
            startDate,
            endDate,
            projectId,
            participants: parsedParticipants,
            status,
            createdBy,
            relatedDocuments
        });
        await newTask.save();

        // Create a corresponding calendar event for the task
        const newEvent = new CalendarEvent({
            title: taskName,
            description: 'Task: ' + taskName,
            eventDate: startDate,
            endDate: endDate,
            createdBy,
            onModel: 'Task',
            eventType: 'Task',
            projectId,
            onModel : 'Developer',
            participants: parsedParticipants.map(p => ({ participantId: p.participantId, onModel: 'Developer' }))
        });
        await newEvent.save();

        // Create individual notifications for each participant
        const participantIds = parsedParticipants.map(p => p.participantId);
        for (const recipientId of participantIds) {
            const notification = new Notification({
                recipient: recipientId,
                content: `New Task created: ${taskName}`,
                type: 'Task',
                relatedId: newTask._id
            });
            await notification.save();
        }

        await sendEmailToParticipants(participantIds, newTask);

        res.status(201).json({ message: 'Task and corresponding calendar event added successfully', task: newTask, event: newEvent });
    } catch (error) {
        console.error('Failed to add task and corresponding calendar event:', error);
        res.status(500).json({ message: 'Error adding task and calendar event', error: error.message });
    }
};

// Update a task
const updateTask = async (req, res) => {
    try {
        const taskId = req.params.taskId;
        const updates = { ...req.body };
        const files = req.files; // This will now be an object with field names as keys

        // Fetch existing task
        const task = await Task.findById(taskId);
        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        // Handle related documents
        if (files && files.relatedDocuments) {
            let newDocs = [];
            
            // Upload new documents
            for (const file of files.relatedDocuments) {
                const result = await uploadToCloudinary(file.path, 'task-documents');
                newDocs.push(result.secure_url);
            }

            // Handle document deletion if specified
            if (updates.deletedDocuments) {
                const deletedDocs = JSON.parse(updates.deletedDocuments);
                
                // Delete from Cloudinary
                for (const docUrl of deletedDocs) {
                    const publicId = docUrl.split('/').slice(-2).join('/').split('.')[0];
                    await deleteFromCloudinary(publicId);
                }

                // Filter out deleted documents
                const remainingDocs = task.relatedDocuments.filter(
                    doc => !deletedDocs.includes(doc)
                );
                
                // Combine remaining and new documents
                updates.relatedDocuments = [...remainingDocs, ...newDocs];
            } else {
                // Just add new documents to existing ones
                updates.relatedDocuments = [...(task.relatedDocuments || []), ...newDocs];
            }
        }

        // Convert string arrays back to arrays if they're stringified
        if (typeof updates.participants === 'string') {
            updates.participants = JSON.parse(updates.participants);
        }

        // Update the task
        const updatedTask = await Task.findByIdAndUpdate(
            taskId,
            { $set: updates },
            { 
                new: true,
                runValidators: true 
            }
        ).populate('participants.participantId', 'username email')
         .populate('projectId', 'title');

        // Create individual notifications for each participant
        const participantIds = updatedTask.participants.map(p => p.participantId._id);
        for (const recipientId of participantIds) {
            const notification = new Notification({
                recipient: recipientId,
                content: `Task updated: ${updatedTask.taskName}`,
                type: 'Task',
                relatedId: updatedTask._id
            });
            await notification.save();
        }

        res.status(200).json({ 
            message: 'Task updated successfully', 
            task: updatedTask 
        });

    } catch (error) {
        console.error('Failed to update task:', error);
        res.status(500).json({ 
            message: 'Error updating task', 
            error: error.message 
        });
    }
};

// Fetch tasks for a project
const getTasksByProject = async (req, res) => {
    try {
        const projectId = req.params.projectId;
        const tasks = await Task.find({ projectId });

        res.status(200).json(tasks);
    } catch (error) {
        console.error('Failed to fetch tasks:', error);
        res.status(500).json({ message: 'Error fetching tasks', error: error.message });
    }
};

// Delete a task
const deleteTask = async (req, res) => {
    try {
        const taskId = req.params.taskId;

        const task = await Task.findById(taskId);
        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        // Create individual notifications for each participant about task deletion
        const participantIds = task.participants.map(p => p.participantId);
        for (const recipientId of participantIds) {
            const notification = new Notification({
                recipient: recipientId,
                content: `Task deleted: ${task.taskName}`,
                type: 'Task',
                relatedId: task._id
            });
            await notification.save();
        }

        await Task.findByIdAndDelete(taskId);

        res.status(200).json({ message: 'Task deleted successfully' });
    } catch (error) {
        console.error('Failed to delete task:', error);
        res.status(500).json({ message: 'Error deleting task', error: error.message });
    }
};

// Fetch all tasks
const getAllTasks = async (req, res) => {
    try {
        const tasks = await Task.find()
            .populate('projectId', 'title') // Populate project title
            .populate('participants.participantId', 'username') // Populate participant usernames
            .populate('createdBy', 'username'); // Populate creator username

        res.status(200).json(tasks);
    } catch (error) {
        console.error('Failed to fetch tasks:', error);
        res.status(500).json({ message: 'Error fetching tasks', error: error.message });
    }
};

// Fetch a task by ID
const getTaskById = async (req, res) => {
    try {
        const taskId = req.params.taskId;
        const task = await Task.findById(taskId)
            .populate('projectId', 'title') // Populate project title
            .populate('participants.participantId', 'username') // Populate participant usernames
            .populate('createdBy', 'username'); // Populate creator username

        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        res.status(200).json(task);
    } catch (error) {
        console.error('Failed to fetch task:', error);
        res.status(500).json({ message: 'Error fetching task', error: error.message });
    }
};

// Add task update
const addTaskUpdate = async (req, res) => {
    try {
        const taskId = req.params.taskId;
        const content = req.body.content;
        const files = req.files;  // This will contain files from 'media' field
        let relatedMedia = [];

        // Handle file uploads
        if (files && files.length > 0) {
            for (const file of files) {
                const result = await uploadToCloudinary(file.path, 'task-updates');
                relatedMedia.push(result.secure_url);
            }
        }

        // Determine user type, ID, and name
        let updatedBy, updatedByModel, updatedByName;
        if (req.admin) {
            updatedBy = req.admin._id;
            updatedByModel = 'Admin';
            updatedByName = req.admin.username;
        } else if (req.manager) {
            updatedBy = req.manager._id;
            updatedByModel = 'Manager';
            updatedByName = req.manager.username;
        } else if (req.developer) {
            updatedBy = req.developer._id;
            updatedByModel = 'Developer';
            updatedByName = req.developer.username;
        }

        // Validate content
        if (!content) {
            return res.status(400).json({ 
                message: 'Content is required for the update' 
            });
        }

        const update = {
            content,
            updatedBy,
            updatedByModel,
            updatedByName,  // Added username
            relatedMedia
        };

        const task = await Task.findByIdAndUpdate(
            taskId,
            { $push: { updates: update } },
            { 
                new: true,
                runValidators: true 
            }
        ).populate({
            path: 'updates.updatedBy',
            select: 'username',
            model: updatedByModel
        });

        if (!task) {
            return res.status(404).json({ 
                message: 'Task not found' 
            });
        }

        // Create individual notifications for each participant about the update
        const participantIds = task.participants.map(p => p.participantId);
        for (const recipientId of participantIds) {
            const notification = new Notification({
                recipient: recipientId,
                content: `Task update added: ${task.taskName}`,
                type: 'Task',
                relatedId: task._id
            });
            await notification.save();
        }

        res.status(200).json({ 
            message: 'Update added successfully', 
            task 
        });
    } catch (error) {
        console.error('Error adding task update:', error);
        res.status(500).json({ 
            message: 'Error adding update', 
            error: error.message 
        });
    }
};

// Add final result
const addFinalResult = async (req, res) => {
    try {
        const taskId = req.params.taskId;
        const { description } = req.body;
        const files = req.files;
        let resultImages = [];

        // Determine user type, ID, and name
        let updatedBy, updatedByModel, updatedByName;
        if (req.admin) {
            updatedBy = req.admin._id;
            updatedByModel = 'Admin';
            updatedByName = req.admin.username;
        } else if (req.manager) {
            updatedBy = req.manager._id;
            updatedByModel = 'Manager';
            updatedByName = req.manager.username;
        } else if (req.developer) {
            updatedBy = req.developer._id;
            updatedByModel = 'Developer';
            updatedByName = req.developer.username;
        }

        // Validate description
        if (!description) {
            return res.status(400).json({ 
                message: 'Description is required for the final result' 
            });
        }

        // Handle file uploads
        if (files && files.length > 0) {
            for (const file of files) {
                const result = await uploadToCloudinary(file.path, 'task-results');
                resultImages.push(result.secure_url);
            }
        }

        // Find and update the task
        const task = await Task.findByIdAndUpdate(
            taskId,
            {
                finalResult: {
                    description,
                    resultImages,
                    updatedBy,
                    updatedByModel,
                    updatedByName  // Added username
                },
                status: 'Completed'
            },
            { 
                new: true,
                runValidators: true 
            }
        ).populate({
            path: 'finalResult.updatedBy',
            select: 'username',
            model: updatedByModel
        });

        if (!task) {
            return res.status(404).json({ 
                message: 'Task not found' 
            });
        }

        // Create individual notifications for each participant about the final result
        const participantIds = task.participants.map(p => p.participantId);
        for (const recipientId of participantIds) {
            const notification = new Notification({
                recipient: recipientId,
                content: `Final result added for task: ${task.taskName}`,
                type: 'Task',
                relatedId: task._id
            });
            await notification.save();
        }

        res.status(200).json({ 
            message: 'Final result added successfully', 
            task 
        });

    } catch (error) {
        console.error('Error adding final result:', error);
        res.status(500).json({ 
            message: 'Error adding final result', 
            error: error.message 
        });
    }
};

// Delete task update
const deleteTaskUpdate = async (req, res) => {
    try {
        const { taskId, updateId } = req.params;
        
        // Find the task first to get the update details
        const task = await Task.findById(taskId);
        if (!task) {
            return res.status(404).json({ 
                message: 'Task not found' 
            });
        }

        // Find the update to get media URLs before deletion
        const update = task.updates.find(u => u.updateId.toString() === updateId);
        if (!update) {
            return res.status(404).json({ 
                message: 'Update not found' 
            });
        }

        // Delete media files from Cloudinary if they exist
        if (update.relatedMedia && update.relatedMedia.length > 0) {
            for (const mediaUrl of update.relatedMedia) {
                try {
                    const publicId = mediaUrl.split('/').slice(-2).join('/').split('.')[0];
                    await deleteFromCloudinary(publicId);
                } catch (cloudinaryError) {
                    console.error('Error deleting from Cloudinary:', cloudinaryError);
                }
            }
        }

        // Use updateOne to avoid validation of the entire document
        await Task.updateOne(
            { _id: taskId },
            { $pull: { updates: { updateId: new mongoose.Types.ObjectId(updateId) } } }
        );

        // Create individual notifications for each participant about the update deletion
        const participantIds = task.participants.map(p => p.participantId);
        for (const recipientId of participantIds) {
            const notification = new Notification({
                recipient: recipientId,
                content: `Task update deleted: ${task.taskName}`,
                type: 'Task',
                relatedId: task._id
            });
            await notification.save();
        }

        res.status(200).json({ 
            message: 'Update deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting task update:', error);
        res.status(500).json({ 
            message: 'Error deleting update', 
            error: error.message 
        });
    }
};

module.exports = {
    addTask,
    updateTask,
    getTasksByProject,
    deleteTask,
    getAllTasks,
    getTaskById,
    addTaskUpdate,
    addFinalResult,
    deleteTaskUpdate
};
