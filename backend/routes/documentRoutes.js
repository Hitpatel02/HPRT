const express = require('express');
const { authenticateToken } = require('../middlewares/auth');
const router = express.Router();
const {
    getDocumentsByMonth,
    getDocumentById,
    updateDocument,
    deleteDocument,
    createDocumentsForAll,
    createDocumentForClient,
    getAllDocuments
} = require('../controllers/documentController');

/**
 * @route   GET /api/documents
 * @desc    Get all document records
 * @access  Private
 */
router.get('/', authenticateToken, getAllDocuments);

/**
 * @route   GET /api/documents/month/:month
 * @desc    Get all document records for a specific month
 * @access  Private
 */
router.get('/month/:month', authenticateToken, getDocumentsByMonth);

/**
 * @route   GET /api/documents/:id
 * @desc    Get a document record by ID
 * @access  Private
 */
router.get('/:id', authenticateToken, getDocumentById);

/**
 * @route   PATCH /api/documents/:id
 * @desc    Update a document record
 * @access  Private
 */
router.patch('/:id', authenticateToken, updateDocument);

/**
 * @route   DELETE /api/documents/:id
 * @desc    Delete a document record
 * @access  Private
 */
router.delete('/:id', authenticateToken, deleteDocument);

/**
 * @route   POST /api/documents/create-for-all
 * @desc    Create document records for all clients for the current month
 * @access  Private
 */
router.post('/create-for-all', authenticateToken, createDocumentsForAll);

/**
 * @route   POST /api/documents/create-for-client/:clientId
 * @desc    Create document record for a specific client for the current month
 * @access  Private
 */
router.post('/create-for-client/:clientId', authenticateToken, createDocumentForClient);

module.exports = router; 
