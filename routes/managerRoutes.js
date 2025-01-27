const express = require('express');
const {
  getNonVerifiedDevelopers,
  getAllDevelopers, 
  registerManager,
  managerLogin,
  getManagerProfile,
  updateManagerProfile,
  deleteDeveloper,
  verifyDeveloper,
  updateManagerMedia,
  getManagerNotifications,
  markAllNotificationsAsRead
} = require('../controllers/managerController');
const { registerDeveloper } = require('../controllers/developerController');
const router = express.Router();
const verifyAdminToken = require('../middleware/verifyAdminToken');
const verifyManagerToken = require('../middleware/verifyManagerToken');
const {
  addTask,
  getAllTasks,
  updateTask,
  getTasksByProject,
  deleteTask,
  addTaskUpdate,
  addFinalResult,
  deleteTaskUpdate,
  getTaskById
} = require('../controllers/taskController');
const {
  getProjectsByStatus,
  addProject,
  fetchProjects,
  updateProject,
  deleteProject } = require('../controllers/projectController');
const {
  updateHoliday,
  fetchUserEvents,
  fetchAllEvents,
  addEvent,
  updateEvent,
  deleteEvent,
  getAllHolidays,
  approveOrDenyHoliday,
  deleteHoliday,
  getDeveloperHolidays,
  getHolidayById,
  
} = require('../controllers/calendarController')
const { getDeveloperById } = require('../controllers/developerController');
const { getAllManagers, getAllAdmins, markNotificationAsRead  } = require('../controllers/adminController');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinary');
const { 
    createMarketingTask,
    updateMarketingTask,
    getAllMarketingTasks,
    getMarketingTaskById,
    getMarketingTasksByProject,
    deleteMarketingTask,
    updateLeadsCount
} = require('../controllers/marketingTaskController');
const {addComment, deleteComment, getProjectTaskUpdates,getTaskUpdates} = require('../controllers/taskUpdateController');
const {createRevenue, deleteRevenue, updateRevenue} = require('../controllers/revenueController');
const {getAllMembers} = require('../controllers/digitalMarketingController');
const {getAllContentCreatorMembers} = require('../controllers/contentCreatorController');
// Register a new manager
router.post('/register', verifyAdminToken, registerManager);
router.post('/register-dev', verifyAdminToken, registerDeveloper);
// Manager login
router.post('/login', managerLogin);
router.get('/managers', verifyManagerToken, getAllManagers);
router.get('/admins', verifyManagerToken, getAllAdmins);
// Additional APIs like managing tasks/projects could be added here
router.get('/profile', verifyManagerToken, getManagerProfile);
router.put('/profile', verifyManagerToken, updateManagerProfile);
router.delete('/delete-dev/:developerId', verifyManagerToken, deleteDeveloper);
router.post('/verify-dev/:developerId', verifyManagerToken, verifyDeveloper);
router.get('/developers', verifyManagerToken, getAllDevelopers);  // New route to fetch all developers
router.get('/developer/:developerId',  getDeveloperById);

router.get('/non-verified', verifyManagerToken, getNonVerifiedDevelopers); // New route to fetch non-verified developers
//projects api
router.post('/project', upload.array('relatedDocs', 5), verifyManagerToken, addProject);
router.get('/projects', verifyManagerToken, fetchProjects);
router.put('/project/:projectId', upload.array('relatedDocs', 5), verifyManagerToken, updateProject);
router.delete('/project/:projectId', verifyManagerToken, deleteProject);
router.get('/projects/status', verifyManagerToken, getProjectsByStatus); // New route for fetching projects by status
//calendar
router.post('/events', verifyManagerToken, addEvent);
router.put('/events/:eventId', verifyManagerToken, updateEvent);
router.delete('/events/:eventId', verifyManagerToken, deleteEvent);
router.get('/events', verifyManagerToken, fetchAllEvents);
router.get('/user-events', verifyManagerToken, fetchUserEvents);
// Routes for task operations
router.post('/add-task', upload.array('relatedDocs', 5), verifyManagerToken, addTask);
router.put('/update-task/:taskId', upload.array('relatedDocs', 5), verifyManagerToken, updateTask);
router.get('/project-task/:projectId', verifyManagerToken, getTasksByProject);
router.delete('/delete-task/:taskId', verifyManagerToken, deleteTask);
router.get('/tasks', verifyManagerToken, getAllTasks);
router.get('/task/:taskId', verifyManagerToken, getTaskById);
//holidays
router.put('/holidays/:holidayId', verifyManagerToken, approveOrDenyHoliday);
router.get('/holidays', verifyManagerToken, getAllHolidays);
router.get('/holiday/:holidayId', verifyManagerToken, getHolidayById);
router.put('/holidays/:holidayId', verifyManagerToken, updateHoliday);
router.delete('/holidays/:holidayId', verifyManagerToken, deleteHoliday);
router.get('/developer-holidays', verifyManagerToken, getDeveloperHolidays);

//notifications
router.get('/notifications', verifyManagerToken, getManagerNotifications);
router.put('/notifications/:notificationId/read', verifyManagerToken, markNotificationAsRead);
router.put('/notifications/read', verifyManagerToken, markAllNotificationsAsRead);
// Add these new routes
router.post(
  '/task/:taskId/update',
  verifyManagerToken,
  upload.array('media', 5),
  addTaskUpdate
);

router.post(
  '/task/:taskId/final-result',
  verifyManagerToken,
  upload.array('resultImages', 5),
  addFinalResult
);

router.delete(
  '/task/:taskId/update/:updateId',
  verifyManagerToken,
  deleteTaskUpdate
);

router.put('/update-media',
  verifyManagerToken,
  upload.fields([
    { name: 'profileImage', maxCount: 1 }
  ]),
  updateManagerMedia
);

// Marketing Task Routes
router.post(
    '/marketing-task', 
    verifyManagerToken, 
    upload.array('relatedDocs', 5), 
    createMarketingTask
);

router.put(
    '/marketing-task/:taskId', 
    verifyManagerToken, 
    upload.array('relatedDocs', 5), 
    updateMarketingTask
);

router.get(
    '/marketing-tasks', 
    verifyManagerToken, 
    getAllMarketingTasks
);

router.get(
    '/marketing-task/:taskId', 
    verifyManagerToken, 
    getMarketingTaskById
);

router.get(
    '/project/:projectId/marketing-tasks', 
    verifyManagerToken, 
    getMarketingTasksByProject
);

router.delete(
    '/marketing-task/:taskId', 
    verifyManagerToken, 
    deleteMarketingTask
);

router.put(
    '/marketing-task/:taskId/leads', 
    verifyManagerToken, 
    updateLeadsCount
);

//comment
router.post('/comment/:updateId', verifyManagerToken, addComment);
router.delete('/comment/:updateId/:commentId', verifyManagerToken, deleteComment);
//revenue
router.post('/revenue', verifyManagerToken, createRevenue);
router.delete('/revenue/:revenueId', verifyManagerToken, deleteRevenue);
router.put('/revenue/:revenueId', verifyManagerToken, updateRevenue);
//digital marketing
router.get('/digital-marketing-members', verifyManagerToken, getAllMembers);
//content creator
router.get('/content-creator-members', verifyManagerToken, getAllContentCreatorMembers);  
//task updates
router.get('/task-updates/:taskId', verifyManagerToken, getTaskUpdates);
router.get('/project-task-updates/:projectId', verifyManagerToken, getProjectTaskUpdates);
module.exports = router;
