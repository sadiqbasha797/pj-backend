const express = require('express');
const router = express.Router();
const {
    registerClient,
    loginClient,
    updateClient,
    deleteClient,
    getClientProjects,
    getClientMeetings
} = require('../controllers/clientController');
const verifyClientToken = require('../middleware/verifyClientToken');
const {addComment, deleteComment} = require('../controllers/taskUpdateController');
// Auth routes
router.post('/register', registerClient);
router.post('/login', loginClient);

// Protected routes
router.put('/:clientId', verifyClientToken, updateClient);
router.delete('/:clientId', verifyClientToken, deleteClient);

// Get client's projects (protected route)
router.get('/projects', verifyClientToken, getClientProjects);
router.get('/meetings', verifyClientToken, getClientMeetings);

//comment
router.post('/comment/:updateId', verifyClientToken, addComment);
router.delete('/comment/:updateId/:commentId', verifyClientToken, deleteComment);
module.exports = router;
