const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { getPendingDocuments } = require('../controllers/pendingDocumentController');
const router = express.Router();

/**
 * @route   GET /api/pending-documents
 * @desc    Get all document records with pending status
 * @access  Private
 */
router.get('/', authenticateToken, getPendingDocuments);

module.exports = router; 