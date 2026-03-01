const express = require("express");
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();
const {
    login,
    getUsers,
    deleteUser,
    createUser,
    updateUser,
    changePassword,
    verifyToken
} = require('../controllers/authController');

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate admin user & get token
 * @access  Public
 */
router.post("/login", login);

/**
 * @route   GET /api/auth/users
 * @desc    Get all admin users
 * @access  Private
 */
router.get('/users', authenticateToken, getUsers);

/**
 * @route   DELETE /api/auth/users/:id
 * @desc    Delete an admin user
 * @access  Private
 */
router.delete('/users/:id', authenticateToken, deleteUser);

/**
 * @route   POST /api/auth/users
 * @desc    Create a new admin user
 * @access  Private
 */
router.post('/users', authenticateToken, createUser);

/**
 * @route   PUT /api/auth/users/:id
 * @desc    Update an admin user
 * @access  Private
 */
router.put('/users/:id', authenticateToken, updateUser);

/**
 * @route   PUT /api/auth/change-password
 * @desc    Change user's own password
 * @access  Private
 */
router.put('/change-password', authenticateToken, changePassword);

/**
 * @route   GET /api/auth/verify
 * @desc    Verify user token and return user information
 * @access  Private
 */
router.get('/verify', authenticateToken, verifyToken);

module.exports = router;
