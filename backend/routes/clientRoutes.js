const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();
const {
    getAllClients,
    getClientById,
    createClient,
    updateClient,
    deleteClient,
    getClientStatus,
    updateClientStatus,
    sendClientWhatsAppReminder,
    getClientDocuments
} = require('../controllers/clientController');

/**
 * @route   GET /api/clients
 * @desc    Get all clients
 * @access  Private
 */
router.get('/', authenticateToken, getAllClients);

/**
 * @route   GET /api/clients/:id
 * @desc    Get client by ID
 * @access  Private
 */
router.get('/:id', authenticateToken, getClientById);

/**
 * @route   POST /api/clients
 * @desc    Create a new client
 * @access  Private
 */
router.post('/', authenticateToken, createClient);

/**
 * @route   PATCH /api/clients/:id
 * @desc    Update client details
 * @access  Private
 */
router.patch('/:id', authenticateToken, updateClient);

/**
 * @route   PUT /api/clients/:id
 * @desc    Update client details (alternative to PATCH)
 * @access  Private
 */
router.put('/:id', authenticateToken, updateClient);

/**
 * @route   DELETE /api/clients/:id
 * @desc    Delete a client
 * @access  Private
 */
router.delete('/:id', authenticateToken, deleteClient);

/**
 * @route   GET /api/clients/:id/status
 * @desc    Get reporting status for a client
 * @access  Private
 */
router.get('/:id/status', authenticateToken, getClientStatus);

/**
 * @route   PATCH /api/clients/:id/status
 * @desc    Update reporting status for a client
 * @access  Private
 */
router.patch('/:id/status', authenticateToken, updateClientStatus);

/**
 * @route   POST /api/clients/:id/send-reminder
 * @desc    Send a WhatsApp reminder to a client
 * @access  Private
 */
router.post('/:id/send-reminder', authenticateToken, sendClientWhatsAppReminder);

/**
 * @route   GET /api/clients/:id/documents
 * @desc    Get all documents for a client
 * @access  Private
 */
router.get('/:id/documents', authenticateToken, getClientDocuments);

module.exports = router; 