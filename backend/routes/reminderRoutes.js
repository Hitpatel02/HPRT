const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { 
    getReminders, 
    updateReminders, 
    resetReminders, 
    triggerReminder 
} = require('../controllers/reminderController');
const router = express.Router();

/**
 * @route   GET /api/reminders
 * @desc    Get current reminder dates
 * @access  Private
 */
router.get('/', authenticateToken, getReminders);

/**
 * @route   PATCH /api/reminders
 * @desc    Update reminder dates (partial update)
 * @access  Private
 */
router.patch('/', authenticateToken, updateReminders);

/**
 * @route   DELETE /api/reminders
 * @desc    Reset all reminder dates
 * @access  Private
 */
router.delete('/', authenticateToken, resetReminders);

/**
 * @route   POST /api/reminders/trigger/:type
 * @desc    Manually trigger a specific reminder
 * @access  Private
 */
router.post('/trigger/:type', authenticateToken, triggerReminder);

module.exports = router;
