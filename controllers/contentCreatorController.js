const ContentCreator = require('../models/contentCreator');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinary');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Notification = require('../models/Notification');
const CalendarEvent = require('../models/calendarEvent');

// Register a new content creator
const registerContentCreator = async (req, res) => {
    try {
        const { username, password, email, skills } = req.body;
        
        // Check if user already exists
        const existingUser = await ContentCreator.findOne({ 
            $or: [{ email }, { username }] 
        });
        
        if (existingUser) {
            return res.status(400).json({ 
                success: false, 
                message: 'User with this email or username already exists' 
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Handle image upload if present
        let imageUrl = null;
        if (req.file) {
            const result = await uploadToCloudinary(req.file.path, 'content-creator-profiles');
            imageUrl = result.secure_url;
        }

        // Create new user
        const newUser = new ContentCreator({
            username,
            password: hashedPassword,
            email,
            skills: skills || [],
            image: imageUrl
        });

        await newUser.save();

        res.status(201).json({
            success: true,
            message: 'Content Creator account created successfully',
            data: {
                username: newUser.username,
                email: newUser.email,
                skills: newUser.skills,
                image: newUser.image
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error creating content creator account',
            error: error.message
        });
    }
};

// Login
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user
        const user = await ContentCreator.findOne({ email });
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            { id: user._id, role: 'content-creator' },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(200).json({
            success: true,
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                skills: user.skills,
                image: user.image
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error during login',
            error: error.message
        });
    }
};

// Update profile
const updateProfile = async (req, res) => {
    try {
        const { username, email, skills } = req.body;
        const userId = req.contentCreator._id;

        const user = await ContentCreator.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Handle image update if present
        if (req.file) {
            // Delete old image if exists
            if (user.image) {
                const publicId = user.image.split('/').pop().split('.')[0];
                await deleteFromCloudinary(publicId);
            }
            
            // Upload new image
            const result = await uploadToCloudinary(req.file.path, 'content-creator-profiles');
            user.image = result.secure_url;
        }

        // Update other fields
        if (username) user.username = username;
        if (email) user.email = email;
        if (skills) user.skills = skills;

        await user.save();

        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            data: {
                username: user.username,
                email: user.email,
                skills: user.skills,
                image: user.image
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating profile',
            error: error.message
        });
    }
};

// Get profile
const getProfile = async (req, res) => {
    try {
        const userId = req.contentCreator._id;
        
        const user = await ContentCreator.findById(userId)
            .select('-password');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.status(200).json({
            success: true,
            data: user
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching profile',
            error: error.message
        });
    }
};

// Delete profile
const deleteProfile = async (req, res) => {
    try {
        const userId = req.contentCreator._id;

        const user = await ContentCreator.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Delete profile image from cloudinary if exists
        if (user.image) {
            const publicId = user.image.split('/').pop().split('.')[0];
            await deleteFromCloudinary(publicId);
        }

        await user.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Profile deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting profile',
            error: error.message
        });
    }
};

const fetchNotifications = async (req, res) => {
    try {
        const userId = req.contentCreator._id;

        const notifications = await Notification.find({
            recipient: userId
        }).sort({ date: -1 }); // Sort by date descending (newest first)

        if (notifications.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No notifications found'
            });
        }

        res.status(200).json({
            success: true,
            data: notifications
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching notifications',
            error: error.message
        });
    }
};

const markAllNotificationsAsRead = async (req, res) => {
    try {
        const userId = req.contentCreator._id;

        await Notification.updateMany(
            { 
                recipient: userId,
                read: false 
            },
            { read: true }
        );

        res.status(200).json({
            success: true,
            message: 'All notifications marked as read'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error marking notifications as read',
            error: error.message
        });
    }
};
// Fetch all content creator members
const getAllContentCreatorMembers = async (req, res) => {
    try {
        const members = await ContentCreator.find({}, {
            password: 0, // Exclude password from response
            __v: 0 // Exclude version key
        });

        if (members.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No content creator members found'
            });
        }

        res.status(200).json({
            success: true,
            data: members
        });

    } catch (error) {
        res.status(500).json({
            success: false, 
            message: 'Error fetching content creator members',
            error: error.message
        });
    }
};

// Admin delete content creator
const adminDeleteContentCreator = async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await ContentCreator.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Delete profile image from cloudinary if exists
        if (user.image) {
            const publicId = user.image.split('/').pop().split('.')[0];
            await deleteFromCloudinary(publicId);
        }

        await user.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Content creator deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting content creator',
            error: error.message
        });
    }
};

// Fetch meetings where the content creator is a participant
const getParticipatingMeetings = async (req, res) => {
    try {
        const userId = req.contentCreator._id;

        const meetings = await CalendarEvent.find({
            'participants': {
                $elemMatch: {
                    participantId: userId,
                    onModel: 'ContentCreator'
                }
            }
        })
        .populate({
            path: 'createdBy',
            select: 'username email -_id',
            refPath: 'onModel'
        })
        .populate({
            path: 'participants.participantId',
            select: 'username email -_id',
            refPath: 'participants.onModel'
        })
        .sort({ eventDate: 1 }); // Sort by date ascending

        if (meetings.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No meetings found'
            });
        }

        res.status(200).json({
            success: true,
            data: meetings
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching meetings',
            error: error.message
        });
    }
};

module.exports = {
    registerContentCreator,
    login,
    updateProfile,
    getProfile,
    deleteProfile,
    fetchNotifications,
    markAllNotificationsAsRead,
    getAllContentCreatorMembers,
    adminDeleteContentCreator,
    getParticipatingMeetings
};
