const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const verifyMarketingToken = require('../middleware/verifyMarketingToken');
const {
    register,
    login,
    updateProfile,
    getProfile,
    deleteProfile,
    fetchNotifications,
    markAllNotificationsAsRead,
    getParticipatingMeetings
} = require('../controllers/digitalMarketingController');

const {createTaskUpdate, getTaskUpdates, addComment, deleteTaskUpdate, updateTaskUpdate, getProjectTaskUpdates} = require('../controllers/taskUpdateController');
const {getAssignedMarketingTasks} = require('../controllers/marketingTaskController');
const {createRevenue, getAllRevenue, getRevenueByProject, updateRevenue, deleteRevenue} = require('../controllers/revenueController');
const {fetchProjects} = require('../controllers/projectController');
// Multer configuration for handling file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const fileFilter = (req, file, cb) => {
    // Accept images only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
        return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
};

const upload = multer({ 
    storage: multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, 'uploads/');
        },
        filename: function (req, file, cb) {
            cb(null, `${Date.now()}-${file.originalname}`);
        }
    }),
    fileFilter: (req, file, cb) => {
        // Accept images and common document types
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif|pdf|doc|docx|xls|xlsx)$/)) {
            return cb(new Error('Only images and documents are allowed!'), false);
        }
        cb(null, true);
    },
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB max file size
    }
});

// Public routes
router.post('/register', upload.single('image'), register);
router.post('/login', login);

// Protected routes - only for digital marketing role
router.use(verifyMarketingToken); // Apply marketing auth middleware to all routes below
router.get('/profile', getProfile);
router.put('/profile', upload.single('image'), updateProfile);
router.delete('/profile', deleteProfile);

// Task Update routes
router.post('/task-updates',verifyMarketingToken, upload.array('attachments', 5), createTaskUpdate);
router.get('/task-updates/:taskId', verifyMarketingToken, getTaskUpdates);
router.post('/task-updates/:id/comments', verifyMarketingToken, addComment);
router.delete('/task-updates/:id', verifyMarketingToken, deleteTaskUpdate);
router.put('/task-updates/:id', verifyMarketingToken, upload.array('attachments', 5), updateTaskUpdate);

// Revenue routes
router.post('/revenue', verifyMarketingToken, upload.array('attachments', 5), createRevenue);
router.get('/revenue', verifyMarketingToken, getAllRevenue);
router.get('/revenue/project/:projectId', verifyMarketingToken, getRevenueByProject);
router.put('/revenue/:revenueId', verifyMarketingToken, upload.array('attachments', 5), updateRevenue);
router.delete('/revenue/:revenueId', verifyMarketingToken, deleteRevenue);

// Get assigned marketing tasks
router.get('/assigned-tasks', verifyMarketingToken, getAssignedMarketingTasks);

// Get task updates for a specific project
router.get('/project-task-updates/:projectId', verifyMarketingToken, getProjectTaskUpdates);

//project api's
router.get('/projects', verifyMarketingToken, fetchProjects);

// Notifications API's
router.get('/notifications', verifyMarketingToken, fetchNotifications);
router.put('/notifications/mark-all-as-read', verifyMarketingToken, markAllNotificationsAsRead);

// Get participating meetings
router.get('/participating-meetings', verifyMarketingToken, getParticipatingMeetings);

module.exports = router;
