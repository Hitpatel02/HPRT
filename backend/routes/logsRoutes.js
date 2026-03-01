const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  getWhatsAppLogs,
  getEmailLogs,
  downloadWhatsAppLogs,
  downloadEmailLogs,
  clearWhatsAppLogs,
  clearEmailLogs
} = require('../controllers/logsController');

/**
 * @route   GET /api/logs/whatsapp
 * @desc    Get WhatsApp logs with date filter
 * @access  Private
 */
router.get('/whatsapp', authenticateToken, getWhatsAppLogs);

/**
 * @route   GET /api/logs/email
 * @desc    Get email logs with date filter
 * @access  Private
 */
router.get('/email', authenticateToken, getEmailLogs);

/**
 * @route   GET /api/logs/whatsapp/download
 * @desc    Download WhatsApp logs as CSV
 * @access  Private
 */
router.get('/whatsapp/download', authenticateToken, downloadWhatsAppLogs);

/**
 * @route   GET /api/logs/email/download
 * @desc    Download email logs as CSV
 * @access  Private
 */
router.get('/email/download', authenticateToken, downloadEmailLogs);

/**
 * @route   DELETE /api/logs/whatsapp
 * @desc    Clear WhatsApp logs for date range
 * @access  Private
 */
router.delete('/whatsapp', authenticateToken, clearWhatsAppLogs);

/**
 * @route   DELETE /api/logs/email
 * @desc    Clear email logs for date range
 * @access  Private
 */
router.delete('/email', authenticateToken, clearEmailLogs);

module.exports = router; 