const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();
const {
    generateReport,
    getReportData,
    downloadReport,
    downloadReportCSV
} = require('../controllers/reportController');

/**
 * @route   GET /api/reports/generate
 * @desc    Generate a new monthly report with optional date filtering
 * @access  Private
 */
router.get('/generate', authenticateToken, generateReport);

/**
 * @route   GET /api/reports/data
 * @desc    Get report data for display in the frontend
 * @access  Private
 */
router.get('/data', authenticateToken, getReportData);

/**
 * @route   GET /api/reports/download
 * @desc    Download the latest generated report
 * @access  Private
 */
router.get('/download', authenticateToken, downloadReport);

/**
 * @route   GET /api/reports/download-csv
 * @desc    Download report data as CSV
 * @access  Private
 */
router.get('/download-csv', authenticateToken, downloadReportCSV);

module.exports = router;
