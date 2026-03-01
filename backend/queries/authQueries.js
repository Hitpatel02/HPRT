const db = require('../config/db');

/**
 * Get user by email
 * @param {string} email - User email
 * @returns {Promise<Object|null>} - User data or null if not found
 */
async function getUserByEmail(email) {
  const result = await db.query(
    `SELECT * FROM "user".admin_users WHERE email = $1`, 
    [email]
  );
  
  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Update user password 
 * @param {number} userId - User ID
 * @param {string} hashedPassword - Bcrypt hashed password
 * @returns {Promise<void>}
 */
async function updateUserPassword(userId, hashedPassword) {
  await db.query(
    `UPDATE "user".admin_users SET password_hash = $1 WHERE id = $2`,
    [hashedPassword, userId]
  );
}

/**
 * Update user last login time
 * @param {number} userId - User ID
 * @returns {Promise<void>}
 */
async function updateLastLogin(userId) {
  await db.query(
    `UPDATE "user".admin_users SET last_login = NOW() WHERE id = $1`,
    [userId]
  );
}

/**
 * Get all admin users
 * @returns {Promise<Array>} - Array of admin users
 */
async function getAllUsers() {
  const result = await db.query(
    `SELECT id, username, email, created_at, last_login
     FROM "user".admin_users
     ORDER BY username`
  );
  
  return result.rows;
}

/**
 * Get user count
 * @returns {Promise<number>} - Number of admin users
 */
async function getUserCount() {
  const result = await db.query(
    `SELECT COUNT(*) FROM "user".admin_users`
  );
  
  return parseInt(result.rows[0].count);
}

/**
 * Delete user by ID
 * @param {number} userId - User ID
 * @returns {Promise<boolean>} - True if deleted
 */
async function deleteUser(userId) {
  const result = await db.query(
    `DELETE FROM "user".admin_users WHERE id = $1 RETURNING id`,
    [userId]
  );
  
  return result.rows.length > 0;
}

/**
 * Check if username exists
 * @param {string} username - Username to check
 * @returns {Promise<boolean>} - True if exists
 */
async function usernameExists(username) {
  const result = await db.query(
    `SELECT username FROM "user".admin_users WHERE username = $1`,
    [username]
  );
  
  return result.rows.length > 0;
}

/**
 * Check if email exists
 * @param {string} email - Email to check
 * @returns {Promise<boolean>} - True if exists
 */
async function emailExists(email) {
  const result = await db.query(
    `SELECT email FROM "user".admin_users WHERE email = $1`,
    [email]
  );
  
  return result.rows.length > 0;
}

/**
 * Create new admin user
 * @param {Object} userData - User data
 * @returns {Promise<Object>} - Created user
 */
async function createUser(userData) {
  const { username, email, hashedPassword } = userData;
  
  const result = await db.query(
    `INSERT INTO "user".admin_users (username, email, password_hash, created_at)
     VALUES ($1, $2, $3, NOW())
     RETURNING id, username, email, created_at`,
    [username, email, hashedPassword]
  );
  
  return result.rows[0];
}

/**
 * Update user details
 * @param {number} userId - User ID
 * @param {Object} updates - Update fields
 * @returns {Promise<Object|null>} - Updated user or null if not found
 */
async function updateUser(userId, updates) {
  const { username, email } = updates;
  
  const result = await db.query(
    `UPDATE "user".admin_users 
     SET username = $1, email = $2
     WHERE id = $3
     RETURNING id, username, email`,
    [username, email, userId]
  );
  
  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Get user by ID
 * @param {number} userId - User ID
 * @returns {Promise<Object|null>} - User data or null if not found
 */
async function getUserById(userId) {
  const result = await db.query(
    `SELECT id, username, email, created_at, last_login
     FROM "user".admin_users
     WHERE id = $1`,
    [userId]
  );
  
  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Change user password
 * @param {number} userId - User ID
 * @param {string} hashedPassword - Bcrypt hashed password
 * @returns {Promise<boolean>} - True if password changed
 */
async function changePassword(userId, hashedPassword) {
  const result = await db.query(
    `UPDATE "user".admin_users 
     SET password_hash = $1
     WHERE id = $2
     RETURNING id`,
    [hashedPassword, userId]
  );
  
  return result.rows.length > 0;
}

module.exports = {
  getUserByEmail,
  updateUserPassword,
  updateLastLogin,
  getAllUsers,
  getUserCount,
  deleteUser,
  usernameExists,
  emailExists,
  createUser,
  updateUser,
  getUserById,
  changePassword
}; 