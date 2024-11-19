const express = require('express');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const {
    withdrawHoliday,
    fetchHolidays,
    applyForHoliday,
    fetchUserEvents,
    fetchAllEvents,
    updateEvent,
    getAssignedProjects,
    getDeveloperProfile,
    updateDeveloperProfile,
    developerLogin,
    registerDeveloper,
    updateProjectStatus,
    getAssignedTasks,
    fetchDeveloperEvents,
    fetchDeveloperNotifications,
    markAllNotificationsAsRead
} = require('../controllers/developerController');
const {getAllManagers, getAllDevelopers, getAllAdmins, markNotificationAsRead} = require('../controllers/adminController');
const {addEvent,deleteEvent} = require('../controllers/calendarController');
const { addTaskUpdate, deleteTaskUpdate, addFinalResult } = require('../controllers/taskController');
const verifyAdminToken = require('../middleware/verifyAdminToken');
const verifyDeveloperToken = require('../middleware/verifyDeveloperToken');
const router = express.Router();
//user managment api's

router.post('/register', verifyAdminToken, registerDeveloper);
router.post('/login', developerLogin);
router.get('/profile', verifyDeveloperToken, getDeveloperProfile);
router.put('/profile', verifyDeveloperToken, upload.single('image'), updateDeveloperProfile);
//project api's
router.get('/projects', verifyDeveloperToken, getAssignedProjects);
router.put('/project-status/:projectId', verifyDeveloperToken, updateProjectStatus);
//calendar
router.post('/events', verifyDeveloperToken, addEvent);
router.put('/events/:eventId', verifyDeveloperToken, updateEvent);
router.delete('/events/:eventId', verifyDeveloperToken, deleteEvent);
router.get('/events', verifyDeveloperToken, fetchAllEvents);
router.get('/user-events', verifyDeveloperToken, fetchUserEvents);
router.get('/developer-events', verifyDeveloperToken, fetchDeveloperEvents);

//holiday
router.post('/holidays', verifyDeveloperToken, applyForHoliday);
router.get('/holidays', verifyDeveloperToken, fetchHolidays);
router.put('/holidays/withdraw/:holidayId', verifyDeveloperToken, withdrawHoliday);
//task update
router.get('/tasks', verifyDeveloperToken, getAssignedTasks);
router.post('/task/:taskId/update',verifyDeveloperToken,upload.array('media', 5),addTaskUpdate);
router.delete('/task/:taskId/update/:updateId', verifyDeveloperToken, deleteTaskUpdate);
router.post('/task/:taskId/final-result', verifyDeveloperToken, upload.fields([{ name: 'resultImages', maxCount: 5 }]), addFinalResult);
//users
router.get('/managers', verifyDeveloperToken, getAllManagers);
router.get('/developers', verifyDeveloperToken, getAllDevelopers);
router.get('/admins', verifyDeveloperToken, getAllAdmins);
//notifications
router.get('/developer-notifications', verifyDeveloperToken, fetchDeveloperNotifications);
router.put('/notifications/:notificationId/read', verifyDeveloperToken, markNotificationAsRead);
router.put('/notifications/mark-all-read', verifyDeveloperToken, markAllNotificationsAsRead);
module.exports = router;
