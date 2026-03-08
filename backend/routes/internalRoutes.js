/**
 * internalRoutes.js
 *
 * Internal-only HTTP routes used by the reminder worker process to
 * communicate with the backend process (which holds the live WhatsApp
 * client in memory).
 *
 * These routes are NOT exposed to the frontend or public internet.
 * They are protected by a shared secret key (INTERNAL_API_KEY in .env).
 *
 * Why this exists:
 *   The worker and backend are separate PM2 processes with separate memory.
 *   The WhatsApp client (whatsapp-web.js) lives only in the backend process.
 *   The worker cannot call whatsappClient.isReady() and expect it to work —
 *   it always returns false in the worker's own process.
 *   Solution: worker calls this internal HTTP endpoint → backend uses its
 *   own in-memory WhatsApp client to send the message.
 */

const express = require('express');
const router = express.Router();
const whatsappClient = require('../config/whatsappClient');
const { sendWhatsAppReminders } = require('../services/whatsappService');
const settingsQueries = require('../queries/settingsQueries');
const { logger } = require('../utils/logger');

// ── Internal key auth middleware ───────────────────────────────────────────
// Rejects any request that doesn't carry the correct x-internal-key header.
const INTERNAL_KEY = process.env.INTERNAL_API_KEY || 'hprt-internal-secret-2024';

function internalAuth(req, res, next) {
    const key = req.headers['x-internal-key'];
    if (!key || key !== INTERNAL_KEY) {
        logger.warn('[internal] Rejected request with missing/invalid internal key');
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    next();
}

// ── POST /api/internal/send-whatsapp-reminder ──────────────────────────────
/**
 * Called by the reminder worker when a send-whatsapp-reminder job fires.
 * The backend (this process) holds the live WhatsApp client in memory,
 * so only it can actually send messages.
 *
 * Request body:
 *   { settingsId: number, reminderType: string }
 *
 * Response:
 *   200 { success: true, result: { success: N, failed: N } }
 *   503 { success: false, message: 'WhatsApp client is not connected' }
 *   404 { success: false, message: 'Settings not found' }
 *   500 { success: false, message: '...' }
 */
router.post('/send-whatsapp-reminder', internalAuth, async (req, res) => {
    const { settingsId, reminderType } = req.body;

    logger.info(`[internal] WhatsApp reminder request | settingsId=${settingsId} | type=${reminderType}`);

    // Guard: WhatsApp must be connected in THIS process (the backend)
    if (!whatsappClient.isReady()) {
        logger.warn('[internal] WhatsApp client is not connected — worker should retry');
        return res.status(503).json({
            success: false,
            message: 'WhatsApp client is not connected',
        });
    }

    // Fetch settings
    let settings = null;
    try {
        if (settingsId) {
            settings = await settingsQueries.getReminderSettingsById(settingsId);
        } else {
            settings = await settingsQueries.getLatestReminderSettings();
        }
    } catch (err) {
        logger.error('[internal] Error fetching settings:', err.message);
        return res.status(500).json({ success: false, message: `DB error: ${err.message}` });
    }

    if (!settings) {
        logger.error(`[internal] Settings not found for id=${settingsId}`);
        return res.status(404).json({ success: false, message: 'Settings not found' });
    }

    // Send WhatsApp reminders
    try {
        const result = await sendWhatsAppReminders(settings, reminderType);
        logger.info(`[internal] WhatsApp reminders sent | success=${result.success} | failed=${result.failed}`);
        return res.json({ success: true, result });
    } catch (err) {
        logger.error(`[internal] sendWhatsAppReminders threw: ${err.message}`);
        // Return 503 so the worker knows to retry (pg-boss will retry on throw)
        return res.status(503).json({ success: false, message: err.message });
    }
});

// ── GET /api/internal/whatsapp-status ─────────────────────────────────────
/**
 * Lets the worker check whether WhatsApp is connected before sending.
 * Optional — worker can just attempt the send and handle 503.
 */
router.get('/whatsapp-status', internalAuth, (req, res) => {
    const ready = whatsappClient.isReady();
    res.json({ success: true, connected: ready });
});

module.exports = router;
