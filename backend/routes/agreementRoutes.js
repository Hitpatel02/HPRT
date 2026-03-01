const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { generate } = require('../controllers/agreementController');

/**
 * @route   POST /api/agreements/generate
 * @desc    Generate a client agreement PDF
 * @body    { client_name, pan_number, percentage, party_name, address, agreement_date }
 * @returns application/pdf (inline)
 * @access  Private
 */
router.post('/generate', authenticateToken, generate);

module.exports = router;
