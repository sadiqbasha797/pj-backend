const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const {
   
    getNonVerifiedDevelopers,
    registerAdmin,
    adminLogin,
    getAdminProfile, 
    updateAdminProfile, 
    deleteAdmin, 
    getAllDevelopers, 
    getAllManagers,
    deleteDeveloper, 
    deleteManager, 
    updateDeveloper, 
    updateManager, 
    verifyDeveloper,
    initiatePasswordReset,
    resetPassword,
    updateAdminMedia,
    getAllNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead
  } = require('../controllers/adminController');
const verifyAdminToken = require('../middleware/verifyAdminToken'); // Ensure you have this middleware
const { addTask, updateTask, getTasksByProject, deleteTask, getAllTasks, getTaskById, addTaskUpdate, addFinalResult, deleteTaskUpdate } = require('../controllers/taskController');
const { 
  getProjectsByStatus,
  addProject,
  fetchProjects,
  updateProject,
  deleteProject,
  getAssignedDevelopers,
  getProjectById
} = require('../controllers/projectController');
const {
  updateHoliday,
  deleteHoliday,
  approveOrDenyHoliday,
  fetchUserEvents,
  fetchAllEvents,
  addEvent,
  updateEvent,
  deleteEvent,
  getAllHolidays,
  getDeveloperHolidays,
  getHolidayById
} = require('../controllers/calendarController')
const {registerManager} = require('../controllers/managerController');
const {registerDeveloper} = require('../controllers/developerController');
const {registerClient, getAllClients, deleteClient, updateClient} = require('../controllers/clientController');
// Register a new admin
router.post('/register', registerAdmin);
router.post('/register-manager', verifyAdminToken, registerManager);
router.post('/register-dev',verifyAdminToken, registerDeveloper);
//client apis
router.get('/clients',  getAllClients);
router.post('/register-client',verifyAdminToken, registerClient);
router.delete('/delete-client/:clientId', verifyAdminToken, deleteClient);
router.put('/update-client/:clientId', verifyAdminToken, updateClient);
// Admin login
router.post('/login', adminLogin);

// APIs for user management, system settings, etc., could be added here
router.get('/profile', verifyAdminToken, getAdminProfile);
router.put('/profile', verifyAdminToken, updateAdminProfile);
router.delete('/profile', verifyAdminToken, deleteAdmin);
//developer api's
router.get('/developers', verifyAdminToken, getAllDevelopers);
router.delete('/delete-dev/:developerId', verifyAdminToken, deleteDeveloper);
router.put('/update-dev/:developerId', verifyAdminToken, updateDeveloper);
router.post('/developer/verify/:developerId', verifyAdminToken, verifyDeveloper);
//manager api's
router.get('/managers', verifyAdminToken, getAllManagers);
router.delete('/delete-manager/:managerId', verifyAdminToken, deleteManager);
router.put('/update-manager/:managerId', verifyAdminToken, updateManager);
router.get('/non-verified', verifyAdminToken, getNonVerifiedDevelopers);
//project apis
router.post('/project',upload.array('relatedDocs', 5), verifyAdminToken, addProject);
router.get('/projects', verifyAdminToken, fetchProjects);
router.put('/project/:projectId',upload.array('relatedDocs', 5), verifyAdminToken, updateProject);
router.delete('/project/:projectId', verifyAdminToken, deleteProject);
router.get('/projects/status', verifyAdminToken, getProjectsByStatus); 
router.get('/project/assigned-developers/:projectId', verifyAdminToken, getAssignedDevelopers);
router.get('/project/:projectId', verifyAdminToken, getProjectById);
//calendar
router.post('/events', verifyAdminToken, addEvent);
router.put('/events/:eventId', verifyAdminToken, updateEvent);
router.delete('/events/:eventId', verifyAdminToken, deleteEvent);
router.get('/events', verifyAdminToken,fetchAllEvents);
router.get('/user-events', verifyAdminToken, fetchUserEvents);
//holiday
router.put('/holidays/:holidayId', verifyAdminToken, approveOrDenyHoliday);
router.put('/holidays/update/:holidayId', verifyAdminToken, updateHoliday);
router.delete('/holidays/delete/:holidayId', verifyAdminToken, deleteHoliday);
router.get('/holidays', verifyAdminToken, getAllHolidays);
router.get('/holidays/developer/:developerId', verifyAdminToken, getDeveloperHolidays);
router.get('/holidays/:holidayId', verifyAdminToken, getHolidayById); 
//task
router.post('/add-task', upload.array('relatedDocs', 5), verifyAdminToken, addTask);
router.put(
  '/update-task/:taskId', 
  verifyAdminToken, 
  upload.fields([
    { name: 'relatedDocuments', maxCount: 5 },
    { name: 'media', maxCount: 5 },
    { name: 'resultImages', maxCount: 5 }
  ]), 
  updateTask
);router.get('/project-task/:projectId', verifyAdminToken, getTasksByProject);
router.delete('/delete-task/:taskId', verifyAdminToken, deleteTask);
router.get('/all-tasks', verifyAdminToken, getAllTasks);
router.get('/task/:taskId', verifyAdminToken, getTaskById);
router.post('/initiate-password-reset', initiatePasswordReset);
router.post('/reset-password', resetPassword);
// Update the media upload route
router.put('/update-media', 
  verifyAdminToken, 
  upload.fields([
    { name: 'profileImage', maxCount: 1 },
    { name: 'companyLogo', maxCount: 1 }
  ]), 
  updateAdminMedia
);
// Task update routes
router.post('/task/:taskId/update', verifyAdminToken, upload.array('media', 5), addTaskUpdate);
router.post('/task/:taskId/final-result', verifyAdminToken, upload.array('resultImages', 5), addFinalResult);
router.delete('/task/:taskId/update/:updateId', verifyAdminToken, deleteTaskUpdate);
//notifications
router.get('/notifications', verifyAdminToken, getAllNotifications);
router.put('/notifications/:notificationId/read', verifyAdminToken, markNotificationAsRead);
router.put('/notifications/mark-all-read', verifyAdminToken, markAllNotificationsAsRead);
module.exports = router;
