const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  // Get auth header value
  const bearerHeader = req.headers['authorization'];
  if (!bearerHeader) {
    return res.status(403).send({ message: 'No token provided.' });
  }

  // Check if bearer is undefined
  if (bearerHeader && bearerHeader.startsWith('Bearer ')) {
    // Split at the space
    const token = bearerHeader.split(' ')[1];

    // Verify token
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(401).send({ message: 'Failed to authenticate token.' });
      } else {
        // If everything is good, save to request for use in other routes
        req.userId = decoded.id;
        next();
      }
    });
  } else {
    // Forbidden if token is not correctly formatted
    res.status(403).send({ message: 'Bearer token not provided correctly.' });
  }
};

module.exports = verifyToken;
