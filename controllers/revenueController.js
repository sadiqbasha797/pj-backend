const Revenue = require('../models/revenue');
const Project = require('../models/Project');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinary');
const { createNotification } = require('../utils/notificationHelper');
const nodemailer = require('nodemailer');

// Email configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'khanbasha7777777@gmail.com',
        pass: 'hpdi qrqk plrn blzz'
    }
});

// Function to send email notification about revenue entry
const sendRevenueEmail = async (revenue, project) => {
    try {
        // Get Admin model
        const Admin = require('../models/Admin');
        const Manager = require('../models/Manager');

        // Get all admins and managers
        const admins = await Admin.find({});
        const managers = await Manager.find({});

        // Combine all recipient emails
        const emails = [
            ...admins.map(admin => admin.email),
            ...managers.map(manager => manager.email)
        ].filter(Boolean);

        if (emails.length === 0) {
            console.log('No valid email recipients found');
            return;
        }

        // Format attachments info
        const attachmentsText = revenue.attachments?.length > 0
            ? '\n\nAttachments: ' + revenue.attachments.length + ' file(s) uploaded'
            : '';

        const mailOptions = {
            from: 'khanbasha7777777@gmail.com',
            to: emails.join(', '),
            subject: `New Revenue Entry${project ? ` for ${project.title}` : ''}`,
            text: `A new revenue entry has been created

Details:
Amount: ${revenue.revenueGenerated}
Description: ${revenue.description}
Created By: ${revenue.createdBy.name} (${revenue.createdBy.role})
Date: ${new Date(revenue.date).toLocaleDateString()}${attachmentsText}

You can view the complete details in the system.`
        };

        const result = await transporter.sendMail(mailOptions);
        console.log('Revenue email sent successfully:', result.response);

    } catch (error) {
        console.error('Error sending revenue email:', error);
    }
};

// Create new revenue entry
const createRevenue = async (req, res) => {
    try {
        const { projectId, revenueGenerated, description } = req.body;
        
        // Get user info based on type
        let userId, username, userRole;
        if (req.admin) {
            userId = req.admin._id;
            username = req.admin.username;
            userRole = 'admin';
        } else if (req.manager) {
            userId = req.manager._id;
            username = req.manager.username;
            userRole = 'Manager';
        } else if (req.marketingUser) {
            userId = req.marketingUser._id;
            username = req.marketingUser.username;
            userRole = 'digital-marketing';
        } else {
            return res.status(403).json({ message: 'Only admins, managers, and digital marketers can create revenue entries' });
        }

        // Handle attachments if present
        let attachmentUrls = [];
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const result = await uploadToCloudinary(file.path, 'revenue-attachments');
                attachmentUrls.push(result.secure_url);
            }
        }

        const revenue = new Revenue({
            projectId,
            revenueGenerated,
            description,
            attachments: attachmentUrls,
            createdBy: {
                id: userId,
                name: username,
                role: userRole
            }
        });

        await revenue.save();

        // Get project details if projectId exists
        let project = null;
        if (projectId) {
            project = await Project.findById(projectId);
        }

        // Create system notification
        await createNotification(
            null, // null for system-wide notification
            `New revenue of ${revenueGenerated} added${project ? ` for project ${project.title}` : ''}`,
            'revenue',
            revenue._id
        );

        // Send email notification
        await sendRevenueEmail(revenue, project);

        res.status(201).json({
            success: true,
            message: 'Revenue entry created successfully',
            data: revenue
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error creating revenue entry',
            error: error.message
        });
    }
};

// Get all revenue entries
const getAllRevenue = async (req, res) => {
    try {
        const revenue = await Revenue.find()
            .populate('projectId', 'title description status deadline')
            .sort({ date: -1 });

        res.status(200).json({
            success: true,
            data: revenue
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching revenue entries',
            error: error.message
        });
    }
};

// Get revenue by project ID
const getRevenueByProject = async (req, res) => {
    try {
        const { projectId } = req.params;
        const revenue = await Revenue.find({ projectId })
            .populate('projectId', 'title description status deadline')
            .sort({ date: -1 });

        res.status(200).json({
            success: true,
            data: revenue
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching project revenue',
            error: error.message
        });
    }
};

// Update revenue entry
const updateRevenue = async (req, res) => {
    try {
        const { revenueId } = req.params;
        const updates = req.body;

        const revenue = await Revenue.findById(revenueId);
        if (!revenue) {
            return res.status(404).json({
                success: false,
                message: 'Revenue entry not found'
            });
        }

        // Check if user has permission to update
        const userRole = req.admin ? 'admin' : (req.manager ? 'Manager' : (req.marketingUser ? 'digital-marketing' : null));
        if (!userRole) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to update revenue entries'
            });
        }

        // Handle new attachments if present
        if (req.files && req.files.length > 0) {
            const newAttachmentUrls = [];
            for (const file of req.files) {
                const result = await uploadToCloudinary(file.path, 'revenue-attachments');
                newAttachmentUrls.push(result.secure_url);
            }
            updates.attachments = [...(revenue.attachments || []), ...newAttachmentUrls];
        }

        const updatedRevenue = await Revenue.findByIdAndUpdate(
            revenueId,
            updates,
            { new: true }
        );

        // Create notification for update
        await createNotification(
            null,
            `Revenue entry updated: ${updatedRevenue.revenueGenerated}`,
            'revenue',
            revenueId
        );

        res.status(200).json({
            success: true,
            message: 'Revenue entry updated successfully',
            data: updatedRevenue
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating revenue entry',
            error: error.message
        });
    }
};

// Delete revenue entry
const deleteRevenue = async (req, res) => {
    try {
        const { revenueId } = req.params;
        
        const revenue = await Revenue.findById(revenueId);
        if (!revenue) {
            return res.status(404).json({
                success: false,
                message: 'Revenue entry not found'
            });
        }

        // Check if user has permission to delete
        const userRole = req.admin ? 'admin' : (req.manager ? 'Manager' : (req.marketingUser ? 'digital-marketing' : null));
        if (!userRole) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete revenue entries'
            });
        }

        // Delete attachments from cloudinary
        if (revenue.attachments && revenue.attachments.length > 0) {
            for (const attachment of revenue.attachments) {
                const publicId = attachment.split('/').pop().split('.')[0];
                await deleteFromCloudinary(publicId);
            }
        }

        await revenue.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Revenue entry deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting revenue entry',
            error: error.message
        });
    }
};

module.exports = {
    createRevenue,
    getAllRevenue,
    getRevenueByProject,
    updateRevenue,
    deleteRevenue
};
