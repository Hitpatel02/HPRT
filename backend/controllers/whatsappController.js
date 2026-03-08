const { logger } = require('../utils/logger');
const whatsappClient = require('../config/whatsappClient');
const {
    sendTestMessage,
    startGroupIdRetrieval,
    stopGroupIdRetrieval,
} = require('../services/whatsappGroupService');
const { validateGroupId } = require('../utils/whatsappUtils');
const whatsappQueries = require('../queries/whatsappQueries');

// ════════════════════════════════════════
// Phase 3 — Connection management
// ════════════════════════════════════════

/**
 * @desc    Initialize / connect WhatsApp client
 * @route   POST /api/whatsapp/connect
 */
exports.connect = async (req, res, next) => {
    try {
        const result = await whatsappClient.initialize();
        res.json({ success: result.success, message: result.message });
    } catch (error) {
        logger.error('Error connecting WhatsApp:', error);
        next(error);
    }
};

/**
 * @desc    Disconnect WhatsApp client (keep session)
 * @route   POST /api/whatsapp/disconnect
 */
exports.disconnect = async (req, res, next) => {
    try {
        const result = await whatsappClient.disconnect();
        res.json({ success: result.success, message: result.message });
    } catch (error) {
        logger.error('Error disconnecting WhatsApp:', error);
        next(error);
    }
};

/**
 * @desc    Delete WhatsApp session files and reset state
 * @route   DELETE /api/whatsapp/session
 */
exports.deleteSession = async (req, res, next) => {
    try {
        const result = await whatsappClient.deleteSession();
        res.json({ success: result.success, message: result.message });
    } catch (error) {
        logger.error('Error deleting WhatsApp session:', error);
        next(error);
    }
};

/**
 * @desc    Get WhatsApp client status
 * @route   GET /api/whatsapp/status
 */
exports.getStatus = async (req, res, next) => {
    try {
        const status = whatsappClient.getStatus();
        res.json({ success: true, ...status });
    } catch (error) {
        logger.error('Error getting WhatsApp status:', error);
        next(error);
    }
};

// ════════════════════════════════════════
// Existing functionality (preserved)
// ════════════════════════════════════════

/**
 * @desc    Send a test message to a WhatsApp group
 * @route   POST /api/whatsapp/test
 */
exports.sendTest = async (req, res, next) => {
    try {
        const { groupId, message: customMessage } = req.body;

        if (!groupId) {
            return res.status(400).json({ success: false, message: 'Group ID is required' });
        }

        if (!validateGroupId(groupId)) {
            return res.status(400).json({ success: false, message: 'Invalid WhatsApp group ID format' });
        }

        if (!whatsappClient.isReady()) {
            return res.status(503).json({ success: false, message: 'WhatsApp is not connected' });
        }

        // Build IST datetime string for default message
        const istNow = new Date(Date.now() + (5 * 60 + 30) * 60 * 1000)
            .toISOString().replace('T', ' ').slice(0, 19) + ' IST';
        const defaultMessage =
            `✅ Test message from HPRT Reminder System — ${istNow}. ` +
            `If you received this, your group is configured correctly.`;

        const finalMessage = (customMessage && customMessage.trim()) ? customMessage.trim() : defaultMessage;

        const success = await sendTestMessage(groupId, finalMessage);
        if (success) {
            res.json({ success: true, message: 'Message sent successfully to the group' });
        } else {
            res.status(500).json({ success: false, message: 'Failed to send message — check server logs' });
        }
    } catch (error) {
        logger.error('Error sending test message:', error);
        next(error);
    }
};

/**
 * @desc    Start WhatsApp client in group ID retrieval mode
 * @route   POST /api/whatsapp/group-id/start
 */
exports.startGroupIdRetrieval = async (req, res, next) => {
    try {
        const success = await startGroupIdRetrieval();
        if (success) {
            res.json({
                success: true,
                message: 'WhatsApp group ID retrieval mode started',
                instructions: 'Send "!groupid" in your WhatsApp group to retrieve the group ID',
            });
        } else {
            res.status(500).json({ success: false, message: 'Failed to start group ID retrieval mode' });
        }
    } catch (error) {
        logger.error('Error starting WhatsApp group ID retrieval:', error);
        next(error);
    }
};

/**
 * @desc    Stop WhatsApp client group ID retrieval mode
 * @route   POST /api/whatsapp/group-id/stop
 */
exports.stopGroupIdRetrieval = async (req, res, next) => {
    try {
        const success = await stopGroupIdRetrieval();
        res.json({ success, message: success ? 'Group ID retrieval stopped' : 'Failed to stop' });
    } catch (error) {
        logger.error('Error stopping WhatsApp group ID retrieval:', error);
        next(error);
    }
};

/**
 * @desc    Get client WhatsApp groups
 * @route   GET /api/whatsapp/client/:clientId/groups
 */
exports.getClientGroups = async (req, res, next) => {
    try {
        const { clientId } = req.params;
        if (!clientId || isNaN(parseInt(clientId))) {
            return res.status(400).json({ success: false, message: 'Valid client ID is required' });
        }
        const groups = await whatsappQueries.getClientGroups(parseInt(clientId));
        res.json(groups);
    } catch (error) {
        logger.error('Error getting client groups:', error);
        next(error);
    }
};

/**
 * @desc    Get all clients with WhatsApp groups
 * @route   GET /api/whatsapp/clients-with-groups
 */
exports.getClientsWithGroups = async (req, res, next) => {
    try {
        const clients = await whatsappQueries.getClientsWithGroups();
        res.json(clients);
    } catch (error) {
        logger.error('Error getting clients with groups:', error);
        next(error);
    }
};