const jwt = require('jsonwebtoken');
const Client = require('../models/Client');

const verifyClientToken = async (req, res, next) => {
    try {
        // Check for Authorization header
        const authHeader = req.headers.authorization;
        
        if (!authHeader) {
            return res.status(401).json({ message: 'Authorization header missing' });
        }

        // Check if it follows Bearer token format
        if (!authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Invalid token format. Use Bearer token' });
        }

        // Extract token (split 'Bearer token' and get the second part)
        const token = authHeader.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ message: 'No token provided' });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Find client and check if exists
        const client = await Client.findById(decoded.id);
        if (!client) {
            return res.status(401).json({ message: 'Invalid token' });
        }

        // Add client to request object
        req.client = client;
        req.clientId = client._id;
        
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Invalid token' });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token expired' });
        }
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

module.exports = verifyClientToken; 