const jwt = require('jsonwebtoken');
const ContentCreator = require('../models/contentCreator');

const verifyContentCreatorToken = (req, res, next) => {
    const bearerHeader = req.headers['authorization'];
    if (!bearerHeader) {
        return res.status(403).send({ message: 'No token provided.' });
    }

    if (bearerHeader.startsWith('Bearer ')) {
        const token = bearerHeader.split(' ')[1];
        jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
            if (err) {
                return res.status(401).send({ message: 'Failed to authenticate token.' });
            } else {
                // Check if the user is a content creator
                const contentCreator = await ContentCreator.findById(decoded.id);
                if (!contentCreator) {
                    return res.status(403).send({ message: 'Access denied.' });
                }
                req.contentCreator = contentCreator; // Add content creator to request
                next();
            }
        });
    } else {
        res.status(403).send({ message: 'Bearer token not provided correctly.' });
    }
};

module.exports = verifyContentCreatorToken;
