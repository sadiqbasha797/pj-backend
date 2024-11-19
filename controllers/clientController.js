const Client = require('../models/Client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Task = require('../models/Task');
const CalendarEvent = require('../models/calendarEvent');

// Register a new client
exports.registerClient = async (req, res) => {
    try {
        const { clientName, email, password, projectId } = req.body;
        
        // Check if client already exists
        const existingClient = await Client.findOne({ email });
        if (existingClient) {
            return res.status(409).json({ message: 'Email already in use' });
        }

        const client = new Client({
            clientName,
            email,
            password,
            projectId
        });

        await client.save();
        res.status(201).json({ message: 'Client registered successfully', clientId: client._id });
    } catch (error) {
        res.status(500).json({ message: 'Error registering client', error: error.message });
    }
};

// Client login
exports.loginClient = async (req, res) => {
    try {
        const { email, password } = req.body;
        const client = await Client.findOne({ email });

        if (!client) {
            return res.status(404).json({ message: 'Client not found' });
        }

        const isMatch = await bcrypt.compare(password, client.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Generate a token
        const token = jwt.sign({ id: client._id }, process.env.JWT_SECRET);
        
        // Return token with usage instructions
        res.status(200).json({ 
            message: 'Login successful',
            token,
        });
    } catch (error) {
        res.status(500).json({ message: 'Error logging in', error: error.message });
    }
};
// Update client
exports.updateClient = async (req, res) => {
    const { clientId } = req.params;
    const updates = req.body;

    try {
        const client = await Client.findByIdAndUpdate(clientId, updates, { new: true });
        if (!client) {
            return res.status(404).json({ message: 'Client not found' });
        }
        res.status(200).json({ message: 'Client updated successfully', client });
    } catch (error) {
        res.status(500).json({ message: 'Error updating client', error: error.message });
    }
};
// Delete client
exports.deleteClient = async (req, res) => {
    const { clientId } = req.params;

    try {
        const client = await Client.findByIdAndDelete(clientId);
        if (!client) {
            return res.status(404).json({ message: 'Client not found' });
        }
        res.status(200).json({ message: 'Client deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting client', error: error.message });
    }
};

// Get client's projects with related tasks
exports.getClientProjects = async (req, res) => {
    try {
        // Get client from the token
        const clientId = req.client._id;

        // Find client and populate the projects field
        const client = await Client.findById(clientId)
            .populate({
                path: 'projects',
                select: 'title description deadline status updatedAt assignedTo',
                populate: [
                    {
                        path: 'assignedTo',
                        select: 'name email'
                    }
                ]
            });

        if (!client) {
            return res.status(404).json({ message: 'Client not found' });
        }

        // Get all project IDs
        const projectIds = client.projects.map(project => project._id);

        // Fetch all tasks related to these projects
        const tasks = await Task.find({ projectId: { $in: projectIds } })
            .populate([
                {
                    path: 'participants.participantId',
                    select: 'name email'
                },
                {
                    path: 'updates.updatedBy',
                    select: 'name email'
                }
            ]);

        // Create a map of tasks by project ID
        const tasksByProject = tasks.reduce((acc, task) => {
            if (!acc[task.projectId]) {
                acc[task.projectId] = [];
            }
            acc[task.projectId].push(task);
            return acc;
        }, {});

        // Combine projects with their tasks
        const projectsWithTasks = client.projects.map(project => ({
            ...project.toObject(),
            tasks: tasksByProject[project._id] || []
        }));

        res.status(200).json({
            success: true,
            projects: projectsWithTasks
        });
    } catch (error) {
        res.status(500).json({
            message: 'Error fetching client projects and tasks',
            error: error.message
        });
    }
};

// Get client's calendar events/meetings
exports.getClientMeetings = async (req, res) => {
    try {
        const clientId = req.client._id; // From verifyClientToken middleware

        const meetings = await CalendarEvent.find({
            'participants.participantId': clientId,
            'participants.onModel': 'Client',
            'status': 'Active',
            'eventType': 'Meeting' // Filter for meetings only
        })
        .populate([
            {
                // Populate creator details
                path: 'createdBy',
                select: 'name email',
                refPath: 'onModel'
            },
            {
                // Populate other participants
                path: 'participants.participantId',
                select: 'name email clientName', // Include clientName for Client model
                refPath: 'participants.onModel'
            },
            {
                // Populate project details if meeting is related to a project
                path: 'projectId',
                select: 'title description'
            }
        ])
        .sort({ eventDate: 1 }); // Sort by date ascending

        // Format the meetings data
        const formattedMeetings = meetings.map(meeting => ({
            _id: meeting._id,
            title: meeting.title,
            description: meeting.description,
            eventDate: meeting.eventDate,
            endDate: meeting.endDate,
            location: meeting.location,
            isAllDay: meeting.isAllDay,
            project: meeting.projectId ? {
                _id: meeting.projectId._id,
                title: meeting.projectId.title,
                description: meeting.projectId.description
            } : null,
            creator: {
                _id: meeting.createdBy._id,
                name: meeting.createdBy.name || meeting.createdBy.clientName,
                email: meeting.createdBy.email,
                role: meeting.onModel
            },
            participants: meeting.participants.map(participant => ({
                _id: participant.participantId._id,
                name: participant.participantId.name || participant.participantId.clientName,
                email: participant.participantId.email,
                role: participant.onModel
            }))
        }));

        res.status(200).json({
            success: true,
            meetings: formattedMeetings
        });
    } catch (error) {
        res.status(500).json({
            message: 'Error fetching client meetings',
            error: error.message
        });
    }
};

// Get all clients
exports.getAllClients = async (req, res) => {
    try {
        const clients = await Client.find()
            .select('-password') // Exclude password field
            .populate('projects', 'title description'); // Populate projects with selected fields

        res.status(200).json({
            success: true,
            clients: clients
        });
    } catch (error) {
        res.status(500).json({
            message: 'Error fetching clients',
            error: error.message
        });
    }
};




