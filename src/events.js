const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const dataFilePath = path.join(__dirname, '../data/events.json');

/**
 * Read the events data file
 * @returns {Promise<Object>} The data object
 */
async function readDataFile() {
  try {
    const data = await fs.readFile(dataFilePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // If file doesn't exist or is corrupt, return default structure
    return { users: [], categories: [], events: [] };
  }
}

/**
 * Write to the events data file
 * @param {Object} data The data to write
 * @returns {Promise<void>}
 */
async function writeDataFile(data) {
  await fs.writeFile(dataFilePath, JSON.stringify(data, null, 2), 'utf8');
}

/**
 * Create a new event
 * @param {Object} eventData The event data
 * @param {string} userId The user ID
 * @returns {Promise<Object>} The created event
 */
async function createEvent(eventData, userId) {
  const data = await readDataFile();
  
  const newEvent = {
    id: uuidv4(),
    userId,
    name: eventData.name,
    description: eventData.description,
    date: eventData.date,
    time: eventData.time,
    category: eventData.category,
    reminders: eventData.reminders || [],
    createdAt: new Date().toISOString()
  };
  
  data.events.push(newEvent);
  await writeDataFile(data);
  
  return newEvent;
}

/**
 * Get all events for a user
 * @param {string} userId The user ID
 * @returns {Promise<Array>} The user's events
 */
async function getUserEvents(userId) {
  const data = await readDataFile();
  return data.events.filter(event => event.userId === userId);
}

/**
 * Get events sorted by criteria
 * @param {string} userId The user ID
 * @param {string} sortBy The sort criteria (date, category, reminder)
 * @returns {Promise<Array>} The sorted events
 */
async function getSortedEvents(userId, sortBy = 'date') {
  const events = await getUserEvents(userId);
  
  switch(sortBy) {
    case 'date':
      return events.sort((a, b) => new Date(a.date + ' ' + a.time) - new Date(b.date + ' ' + b.time));
    case 'category':
      return events.sort((a, b) => a.category.localeCompare(b.category));
    case 'reminder':
      return events.sort((a, b) => {
        const aHasReminder = a.reminders && a.reminders.length > 0;
        const bHasReminder = b.reminders && b.reminders.length > 0;
        return bHasReminder - aHasReminder;
      });
    default:
      return events;
  }
}

/**
 * Get event by ID
 * @param {string} eventId The event ID
 * @param {string} userId The user ID
 * @returns {Promise<Object|null>} The event or null if not found
 */
async function getEventById(eventId, userId) {
  const data = await readDataFile();
  return data.events.find(event => event.id === eventId && event.userId === userId) || null;
}

/**
 * Update an event
 * @param {string} eventId The event ID
 * @param {Object} updateData The data to update
 * @param {string} userId The user ID
 * @returns {Promise<Object|null>} The updated event or null if not found
 */
async function updateEvent(eventId, updateData, userId) {
  const data = await readDataFile();
  const eventIndex = data.events.findIndex(event => event.id === eventId && event.userId === userId);
  
  if (eventIndex === -1) return null;
  
  data.events[eventIndex] = {
    ...data.events[eventIndex],
    ...updateData,
    updatedAt: new Date().toISOString()
  };
  
  await writeDataFile(data);
  return data.events[eventIndex];
}

/**
 * Delete an event
 * @param {string} eventId The event ID
 * @param {string} userId The user ID
 * @returns {Promise<boolean>} True if deleted, false if not found
 */
async function deleteEvent(eventId, userId) {
  const data = await readDataFile();
  const initialLength = data.events.length;
  
  data.events = data.events.filter(event => !(event.id === eventId && event.userId === userId));
  
  if (data.events.length === initialLength) return false;
  
  await writeDataFile(data);
  return true;
}

/**
 * Add a reminder to an event
 * @param {string} eventId The event ID
 * @param {Object} reminderData The reminder data
 * @param {string} userId The user ID
 * @returns {Promise<Object|null>} The updated event or null if not found
 */
async function addReminder(eventId, reminderData, userId) {
  const data = await readDataFile();
  const eventIndex = data.events.findIndex(event => event.id === eventId && event.userId === userId);
  
  if (eventIndex === -1) return null;
  
  const reminder = {
    id: uuidv4(),
    time: reminderData.time,
    type: reminderData.type || 'notification',
    createdAt: new Date().toISOString()
  };
  
  if (!data.events[eventIndex].reminders) {
    data.events[eventIndex].reminders = [];
  }
  
  data.events[eventIndex].reminders.push(reminder);
  await writeDataFile(data);
  
  return data.events[eventIndex];
}

/**
 * Get all categories
 * @returns {Promise<Array>} The categories
 */
async function getCategories() {
  const data = await readDataFile();
  return data.categories || [];
}

/**
 * Add a new category
 * @param {string} category The category name
 * @returns {Promise<Array>} The updated categories
 */
async function addCategory(category) {
  const data = await readDataFile();
  
  if (!data.categories) {
    data.categories = [];
  }
  
  if (!data.categories.includes(category)) {
    data.categories.push(category);
    await writeDataFile(data);
  }
  
  return data.categories;
}

/**
 * Get upcoming events with active reminders
 * @returns {Promise<Array>} Events with upcoming reminders
 */
async function getUpcomingReminders() {
  const data = await readDataFile();
  const now = new Date();
  
  return data.events
    .filter(event => {
      const eventDate = new Date(`${event.date} ${event.time}`);
      return eventDate > now && event.reminders && event.reminders.length > 0;
    })
    .map(event => {
      // Add user information to the event for notification purposes
      const user = data.users.find(user => user.id === event.userId);
      return {
        ...event,
        userEmail: user ? user.email : null
      };
    });
}

module.exports = {
  createEvent,
  getUserEvents,
  getSortedEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  addReminder,
  getCategories,
  addCategory,
  getUpcomingReminders
};