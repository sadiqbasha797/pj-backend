const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const Manager = require('../models/Manager');
const Developer = require('../models/Developer');

const messageAuth = async (req, res, next) => {
    const bearerHeader = req.headers['authorization'];
    if (!bearerHeader) {
        return res.status(403).send({ message: 'No token provided.' });
    }

    if (bearerHeader.startsWith('Bearer ')) {
        const token = bearerHeader.split(' ')[1];
        
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            // Try to find the user in all three collections
            const admin = await Admin.findById(decoded.id);
            const manager = await Manager.findById(decoded.id);
            const developer = await Developer.findById(decoded.id);

            if (admin) {
                req.user = { ...admin.toObject(), role: 'admin' };
            } else if (manager) {
                req.user = { ...manager.toObject(), role: 'manager' };
            } else if (developer) {
                req.user = { ...developer.toObject(), role: 'developer' };
            } else {
                return res.status(403).send({ message: 'User not found.' });
            }

            next();
        } catch (error) {
            return res.status(401).send({ message: 'Failed to authenticate token.' });
        }
    } else {
        res.status(403).send({ message: 'Bearer token not provided correctly.' });
    }
};

module.exports = messageAuth; 