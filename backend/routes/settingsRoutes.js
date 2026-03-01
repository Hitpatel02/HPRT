const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();
const { 
    getReminderSettings,
    getAvailableMonths,
    getSettingsForMonth,
    createReminderSettings,
    updateReminderSettings,
    deleteReminderSettings,
    saveSettingsForMonth,
    updateNotificationSettings,
    reloadSchedulerSettings
} = require('../controllers/settingsController');

/**
 * @route   GET /api/settings
 * @desc    Get current reminder settings
 * @access  Private
 */
router.get('/', authenticateToken, getReminderSettings);

/**
 * @route   POST /api/settings
 * @desc    Create new reminder settings
 * @access  Private
 */
router.post('/', authenticateToken, createReminderSettings);

/**
 * @route   PATCH /api/settings/:id
 * @desc    Update reminder settings
 * @access  Private
 */
router.patch('/:id', authenticateToken, updateReminderSettings);

/**
 * @route   DELETE /api/settings/:id
 * @desc    Delete reminder settings
 * @access  Private
 */
router.delete('/:id', authenticateToken, deleteReminderSettings);

/**
 * @route   GET /api/settings/months/available
 * @desc    Get all available months with reminder settings
 * @access  Private
 */
router.get('/months/available', authenticateToken, getAvailableMonths);

/**
 * @route   GET /api/settings/:year/:month
 * @desc    Get settings for a specific month and year
 * @access  Private
 */
router.get('/:year/:month', authenticateToken, getSettingsForMonth);

/**
 * @route   POST /api/settings/:year/:month
 * @desc    Save settings for a specific month and year
 * @access  Private
 */
router.post('/:year/:month', authenticateToken, saveSettingsForMonth);

/**
 * @route   PATCH /api/settings/notifications
 * @desc    Update notification settings
 * @access  Private
 */
router.patch('/notifications', authenticateToken, updateNotificationSettings);

/**
 * @route   GET /api/settings/scheduler/reload
 * @desc    Reload the scheduler
 * @access  Private
 */
router.get('/scheduler/reload', authenticateToken, reloadSchedulerSettings);

module.exports = router; 