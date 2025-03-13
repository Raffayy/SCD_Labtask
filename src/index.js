const express = require('express');
const dotenv = require('dotenv');
const eventRoutes = require('./routes/eventRoutes');
const authRoutes = require('./routes/authRoutes');
const reminderService = require('./services/reminderServices');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);

// Start reminder service
reminderService.initializeReminders();

// Default route
app.get('/', (req, res) => {
  res.send('Event Planning and Reminder System API');
});

// Start server
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = { app, server };