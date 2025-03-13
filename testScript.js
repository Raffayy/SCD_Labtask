const request = require('supertest');
const fs = require('fs').promises;
const path = require('path');
const { app, server } = require('./src/index');

// Test data
const testUser = {
  username: 'testuser',
  password: 'testpassword',
  email: 'test@example.com'
};

const testEvent = {
  name: 'Test Event',
  description: 'Test event description',
  date: '2025-04-01',
  time: '14:00',
  category: 'Meetings',
  reminders: [
    {
      time: '30 minutes',
      type: 'notification'
    }
  ]
};

// To store the auth token and event ID for tests
let authToken;
let eventId;

// Reset data file after tests
async function resetDataFile() {
  const dataFilePath = path.join(__dirname, 'data/events.json');
  const defaultData = {
    users: [],
    categories: ['Meetings', 'Birthdays', 'Appointments', 'Personal', 'Work'],
    events: []
  };
  await fs.writeFile(dataFilePath, JSON.stringify(defaultData, null, 2), 'utf8');
}

describe('Event Planning and Reminder System', () => {
  // Setup before tests
  beforeAll(async () => {
    await resetDataFile();
  });
  
  // Cleanup after tests
  afterAll(async () => {
    await resetDataFile();
    server.close();
  });
  
  // User Authentication Tests
  describe('User Authentication', () => {
    test('Should register a new user', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser);
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.username).toBe(testUser.username);
    });
    
    test('Should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: testUser.username,
          password: testUser.password
        });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.username).toBe(testUser.username);
      
      // Save token for subsequent tests
      authToken = response.body.token;
    });
    
    test('Should reject login with invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: testUser.username,
          password: 'wrongpassword'
        });
      
      expect(response.status).toBe(401);
    });
  });
  
  // Event Management Tests
  describe('Event Management', () => {
    test('Should create a new event', async () => {
      const response = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testEvent);
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(testEvent.name);
      
      // Save the event ID for later tests
      eventId = response.body.id;
    });
    
    test('Should get all user events', async () => {
      const response = await request(app)
        .get('/api/events')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBeTruthy();
      expect(response.body.length).toBeGreaterThan(0);
    });
    
    test('Should get a specific event by ID', async () => {
      const response = await request(app)
        .get(`/api/events/${eventId}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.id).toBe(eventId);
      expect(response.body.name).toBe(testEvent.name);
    });
    
    test('Should update an event', async () => {
      const updates = {
        name: 'Updated Test Event',
        description: 'Updated description'
      };
      
      const response = await request(app)
        .put(`/api/events/${eventId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updates);
      
      expect(response.status).toBe(200);
      expect(response.body.name).toBe(updates.name);
      expect(response.body.description).toBe(updates.description);
    });
    
    test('Should add a reminder to an event', async () => {
      const reminder = {
        time: '1 hour',
        type: 'email'
      };
      
      const response = await request(app)
        .post(`/api/events/${eventId}/reminders`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(reminder);
      
      expect(response.status).toBe(200);
      expect(response.body.reminders.length).toBeGreaterThan(1);
      expect(response.body.reminders[1].time).toBe(reminder.time);
    });
    
    test('Should get categories', async () => {
      const response = await request(app)
        .get('/api/events/categories/all')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBeTruthy();
      expect(response.body).toContain('Meetings');
    });
    
    test('Should add a new category', async () => {
      const response = await request(app)
        .post('/api/events/categories')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ category: 'Holidays' });
      
      expect(response.status).toBe(200);
      expect(response.body).toContain('Holidays');
    });
    
    test('Should delete an event', async () => {
      const response = await request(app)
        .delete(`/api/events/${eventId}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(204);
      
      // Verify the event was deleted
      const getResponse = await request(app)
        .get(`/api/events/${eventId}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(getResponse.status).toBe(404);
    });
  });
});