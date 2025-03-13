const express = require('express');
const eventModel = require('../events');
const auth = require('../auth');
const router = express.Router();

/**
 * Middleware to authenticate requests
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'Authentication token required' });
  }
  
  try {
    const decodedToken = auth.verifyToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    return res.status(403).json({ message: error.message });
  }
}

/**
 * Get all events for the authenticated user
 * GET /api/events
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const sortBy = req.query.sortBy || 'date';
    const events = await eventModel.getSortedEvents(req.user.id, sortBy);
    res.status(200).json(events);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * Create a new event
 * POST /api/events
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, description, date, time, category, reminders } = req.body;
    
    if (!name || !date || !time) {
      return res.status(400).json({ message: 'Name, date, and time are required' });
    }
    
    const event = await eventModel.createEvent({
      name,
      description: description || '',
      date,
      time,
      category: category || 'Personal',
      reminders
    }, req.user.id);
    
    res.status(201).json(event);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

/**
 * Get a specific event by ID
 * GET /api/events/:id
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const event = await eventModel.getEventById(req.params.id, req.user.id);
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    res.status(200).json(event);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * Update an event
 * PUT /api/events/:id
 */
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const updates = req.body;
    const updatedEvent = await eventModel.updateEvent(req.params.id, updates, req.user.id);
    
    if (!updatedEvent) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    res.status(200).json(updatedEvent);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

/**
 * Delete an event
 * DELETE /api/events/:id
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const deleted = await eventModel.deleteEvent(req.params.id, req.user.id);
    
    if (!deleted) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * Add a reminder to an event
 * POST /api/events/:id/reminders
 */
router.post('/:id/reminders', authenticateToken, async (req, res) => {
  try {
    const { time, type } = req.body;
    
    if (!time) {
      return res.status(400).json({ message: 'Reminder time is required' });
    }
    
    const updatedEvent = await eventModel.addReminder(req.params.id, {
      time,
      type: type || 'notification'
    }, req.user.id);
    
    if (!updatedEvent) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    res.status(200).json(updatedEvent);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

/**
 * Get all categories
 * GET /api/events/categories/all
 */
router.get('/categories/all', authenticateToken, async (req, res) => {
  try {
    const categories = await eventModel.getCategories();
    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * Add a new category
 * POST /api/events/categories
 */
router.post('/categories', authenticateToken, async (req, res) => {
  try {
    const { category } = req.body;
    
    if (!category) {
      return res.status(400).json({ message: 'Category name is required' });
    }
    
    const categories = await eventModel.addCategory(category);
    res.status(200).json(categories);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;