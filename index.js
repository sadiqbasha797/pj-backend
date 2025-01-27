require('dotenv').config(); // This should be at the very top
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const developerRoutes = require('./routes/developerRoutes'); // Assuming you have this file set up
const managerRoutes = require('./routes/managerRoutes');
const adminRoutes = require('./routes/adminRoutes');
const app = express();
const PORT = process.env.PORT || 3000;
const messageRoutes = require('./routes/messageRoutes');
const http = require('http');
const socketIO = require('socket.io');
const clientRoutes = require('./routes/clientRoutes');
const digitalMarketingRoutes = require('./routes/digitalMarketingRoutes');
const contentCreatorRoutes = require('./routes/contentCreatorRoutes');
// Middleware
app.use(cors());
app.use(bodyParser.json()); // bodyParser is deprecated, Express has its own now

// MongoDB Connection
const dbURI = process.env.MONGO_URI || 'mongodb://localhost:27017/projectManagement';
mongoose.connect(dbURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected successfully'))
.catch(err => console.log('MongoDB connection error:', err));

// Base Route
app.get('/', (req, res) => {
  res.send('Project Management API is running...');
});

app.use('/api/manager', managerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/developer', developerRoutes); // Use developer routes
app.use('/api/message', messageRoutes);
app.use('/api/client', clientRoutes);
app.use('/api/digital-marketing', digitalMarketingRoutes);
app.use('/api/content-creator', contentCreatorRoutes);
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "*", // In production, replace with your frontend URL
    methods: ["GET", "POST"]
  }
});

// Store io instance in app for use in controllers
app.set('io', io);

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join', (userId) => {
        socket.join(userId);
        console.log(`User ${userId} joined their room`);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// Change this part from app.listen to server.listen
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

