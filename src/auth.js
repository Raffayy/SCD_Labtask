const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const dataFilePath = path.join(__dirname, '../data/events.json');
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * Read the data file
 * @returns {Promise<Object>} The data object
 */
async function readDataFile() {
  try {
    const data = await fs.readFile(dataFilePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return { users: [], categories: [], events: [] };
  }
}

/**
 * Write to the data file
 * @param {Object} data The data to write
 * @returns {Promise<void>}
 */
async function writeDataFile(data) {
  await fs.writeFile(dataFilePath, JSON.stringify(data, null, 2), 'utf8');
}

/**
 * Register a new user
 * @param {Object} userData The user data
 * @returns {Promise<Object>} The created user (without password)
 */
async function registerUser(userData) {
  const data = await readDataFile();
  
  // Check if username exists
  const userExists = data.users.some(user => user.username === userData.username);
  if (userExists) {
    throw new Error('Username already exists');
  }
  
  // Hash password
  const hashedPassword = await bcrypt.hash(userData.password, 10);
  
  // Create new user
  const newUser = {
    id: uuidv4(),
    username: userData.username,
    password: hashedPassword,
    email: userData.email,
    createdAt: new Date().toISOString()
  };
  
  // Add user to data
  data.users.push(newUser);
  await writeDataFile(data);
  
  // Return user without password
  const { password, ...userWithoutPassword } = newUser;
  return userWithoutPassword;
}

/**
 * Login a user
 * @param {string} username The username
 * @param {string} password The password
 * @returns {Promise<Object>} The token and user data
 */
async function loginUser(username, password) {
  const data = await readDataFile();
  
  // Find user
  const user = data.users.find(user => user.username === username);
  if (!user) {
    throw new Error('Invalid credentials');
  }
  
  // Verify password
  const passwordValid = await bcrypt.compare(password, user.password);
  if (!passwordValid) {
    throw new Error('Invalid credentials');
  }
  
  // Generate token
  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, {
    expiresIn: '24h'
  });
  
  // Return user data and token
  const { password: _, ...userWithoutPassword } = user;
  return {
    token,
    user: userWithoutPassword
  };
}

/**
 * Verify JWT token
 * @param {string} token The JWT token
 * @returns {Object} The decoded token
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid token');
  }
}

/**
 * Get user by ID
 * @param {string} userId The user ID
 * @returns {Promise<Object|null>} The user or null if not found
 */
async function getUserById(userId) {
  const data = await readDataFile();
  const user = data.users.find(user => user.id === userId);
  
  if (!user) return null;
  
  const { password, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

module.exports = {
  registerUser,
  loginUser,
  verifyToken,
  getUserById
};