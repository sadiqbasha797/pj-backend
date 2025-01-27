const jwt = require('jsonwebtoken');
const DigitalMarketingRole = require('../models/digitalMarketingRole');

const verifyMarketingToken = (req, res, next) => {
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
                // Check if the user is a digital marketing role
                const marketingUser = await DigitalMarketingRole.findById(decoded.id);
                if (!marketingUser) {
                    return res.status(403).send({ message: 'Access denied.' });
                }
                req.marketingUser = marketingUser; // Add marketing user to request
                next();
            }
        });
    } else {
        res.status(403).send({ message: 'Bearer token not provided correctly.' });
    }
};

module.exports = verifyMarketingToken;
