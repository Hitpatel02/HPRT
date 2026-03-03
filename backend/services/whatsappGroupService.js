/**
 * whatsappGroupService.js
 *
 * Provides WhatsApp group utilities:
 *  - Send test messages to a group
 *  - Start/stop group-ID retrieval mode (listen for !groupid command)
 *
 * Uses the new whatsappClient singleton (Phase 3 architecture).
 * Old config/whatsapp.js has been removed.
 */

const whatsappClient = require('../config/whatsappClient');
const { logger } = require('../utils/logger');
const { validateGroupId } = require('../utils/whatsappUtils');
const loggingService = require('./loggingService');

// ── State ──────────────────────────────────────────────────────────────────
let groupIdRetrievalMode = false;
let groupIdCallback = null;

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Returns the underlying wwebjs client instance (if connected).
 * Throws if WhatsApp is not ready.
 */
function getReadyClient() {
    if (!whatsappClient.isReady()) {
        throw new Error('WhatsApp client is not connected');
    }
    return whatsappClient.client;
}

// ── Group ID Retrieval ─────────────────────────────────────────────────────

/**
 * Start group ID retrieval mode.
 * The actual message listening is now handled centrally in whatsappClient.js
 *
 * @returns {boolean} success
 */
const startGroupIdRetrieval = async () => {
    try {
        if (groupIdRetrievalMode) {
            logger.info('[whatsappGroupService] Group ID retrieval already active');
            return true;
        }

        groupIdRetrievalMode = true;
        logger.info('[whatsappGroupService] Group ID retrieval mode started — send !groupid in a group');
        return true;
    } catch (err) {
        logger.error('[whatsappGroupService] Failed to start group ID retrieval:', err.message);
        groupIdRetrievalMode = false;
        return false;
    }
};

/**
 * Check if the group ID retrieval mode is currently active
 * @returns {boolean}
 */
const isGroupIdRetrievalActive = () => groupIdRetrievalMode;

/**
 * Handle incoming !groupid messages. Called from whatsappClient message listener.
 * @param {Object} client - The whatsapp client instance
 * @param {Object} message - The incoming message object
 */
const handleGroupIdMessage = async (client, message) => {
    if (!groupIdRetrievalMode) return;

    const groupId = message.from;
    if (!validateGroupId(groupId)) return;

    logger.info(`[whatsappGroupService] Group ID retrieved: ${groupId}`);

    try {
        await client.sendMessage(
            groupId,
            `Group ID: ${groupId}\n\nUse this ID to configure client WhatsApp reminders.\n\n(Test message — please ignore.)`
        );

        await loggingService.logWhatsAppMessage({
            client_id: null,
            group_id: groupId,
            message: '!groupid',
            status: 'received',
        });

        if (groupIdCallback) groupIdCallback(groupId);
    } catch (err) {
        logger.error('[whatsappGroupService] Error responding to !groupid:', err.message);
    }
};

/**
 * Stop listening for group ID messages.
 * @returns {boolean} success
 */
const stopGroupIdRetrieval = async () => {
    try {
        groupIdRetrievalMode = false;
        groupIdCallback = null;

        logger.info('[whatsappGroupService] Group ID retrieval mode stopped');
        return true;
    } catch (err) {
        logger.error('[whatsappGroupService] Error stopping group ID retrieval:', err.message);
        return false;
    }
};

/**
 * Register a callback invoked when a group ID is captured.
 * @param {Function} callback
 */
const onGroupIdRetrieved = (callback) => {
    groupIdCallback = callback;
};

// ── Test Message ───────────────────────────────────────────────────────────

/**
 * Send a test message to a WhatsApp group to verify connectivity.
 * @param {string} groupId
 * @returns {boolean} success
 */
const sendTestMessage = async (groupId) => {
    try {
        if (!validateGroupId(groupId)) {
            logger.error(`[whatsappGroupService] Invalid group ID format: ${groupId}`);
            return false;
        }

        const client = getReadyClient();

        const message =
            `🔔 Test message from HPRT Associates\n` +
            `Time: ${new Date().toLocaleString('en-IN')}\n\n` +
            `WhatsApp notifications are properly configured.`;

        await client.sendMessage(groupId, message);

        await loggingService.logWhatsAppMessage({
            client_id: null,
            group_id: groupId,
            message: 'Test message from HPRT',
            status: 'sent',
        });

        logger.info(`[whatsappGroupService] Test message sent to group ${groupId}`);
        return true;
    } catch (err) {
        logger.error(`[whatsappGroupService] Error sending test message to ${groupId}:`, err.message);

        try {
            await loggingService.logWhatsAppMessage({
                client_id: null,
                group_id: groupId,
                message: 'Test message from HPRT',
                status: 'failed',
                error_message: err.message,
            });
        } catch (logErr) {
            logger.error('[whatsappGroupService] Error logging failure:', logErr.message);
        }

        return false;
    }
};

// ── Exports ────────────────────────────────────────────────────────────────
module.exports = {
    sendTestMessage,
    startGroupIdRetrieval,
    stopGroupIdRetrieval,
    onGroupIdRetrieved,
    isGroupIdRetrievalActive,
    handleGroupIdMessage,
};