/**
 * whatsappService.js — Phase 3 refactor
 *
 * Clean WhatsApp message-sending service. Uses whatsappClient singleton
 * to get the client instance. No initialization logic, no polling, no console.log.
 */
const { DateTime } = require('luxon');
const db = require('../config/db');
const whatsappClient = require('../config/whatsappClient');
const { logger } = require('../utils/logger');

// ════════════════════════════════════════
// Logging helpers
// ════════════════════════════════════════

/**
 * Log a WhatsApp message to the database.
 */
const logWhatsAppMessage = async (groupId, message, status, errorMessage = null, clientId = null) => {
    try {
        // Auto-create table if missing
        await db.query(`
      CREATE TABLE IF NOT EXISTS "user".whatsapp_logs (
        id            SERIAL PRIMARY KEY,
        client_id     INTEGER,
        group_id      VARCHAR(255) NOT NULL,
        message       TEXT NOT NULL,
        status        VARCHAR(50)  NOT NULL,
        sent_at       TIMESTAMPTZ  NOT NULL,
        error_message TEXT,
        created_at    TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP
      );
    `);

        // Resolve clientId if not provided
        if (!clientId) {
            try {
                const res = await db.query(
                    `SELECT id FROM "user".clients WHERE whatsapp_group_id = $1`,
                    [groupId]
                );
                if (res.rows.length > 0) clientId = res.rows[0].id;
            } catch (err) {
                logger.warn(`[whatsappService] Could not resolve clientId for group ${groupId}: ${err.message}`);
            }
        }

        await db.query(
            `INSERT INTO "user".whatsapp_logs (client_id, group_id, message, status, sent_at, error_message)
       VALUES ($1, $2, $3, $4, $5, $6)`,
            [clientId, groupId, message, status, new Date(), errorMessage]
        );
        return true;
    } catch (error) {
        logger.warn(`[whatsappService] Could not log to whatsapp_logs: ${error.message}`);
        return false;
    }
};

// ════════════════════════════════════════
// Core send function
// ════════════════════════════════════════

/**
 * Send a message to a WhatsApp group.
 * Returns false (not throws) if WA is not connected — caller decides how to handle.
 *
 * @param {string} groupId
 * @param {string} message
 * @returns {Promise<boolean>}
 */
const sendGroupMessage = async (groupId, message) => {
    if (!whatsappClient.isReady()) {
        logger.error('[whatsappService] WhatsApp client is not connected');
        return false;
    }

    try {
        const client = whatsappClient.getClient();
        logger.info(`[whatsappService] Sending message to group: ${groupId}`);
        await client.sendMessage(groupId, message);
        logger.info(`[whatsappService] Message sent to ${groupId}`);
        return true;
    } catch (error) {
        logger.error(`[whatsappService] Failed to send message to ${groupId}: ${error.message}`);
        return false;
    }
};

// ════════════════════════════════════════
// Reminder-sending orchestration
// ════════════════════════════════════════

/**
 * Send WhatsApp reminders to all groups with pending documents.
 *
 * Called by the reminder worker. If WhatsApp is not connected, throws so
 * pg-boss can retry.
 *
 * @param {Object} settings    - reminder_settings row
 * @param {string} reminderType - 'gst_1'|'gst_2'|'tds_1'|'tds_2'|'whatsapp'
 */
const sendWhatsAppReminders = async (settings, reminderType = null) => {
    // Guard: WA must be connected — throw so pg-boss retries
    if (!whatsappClient.isReady()) {
        throw new Error('WhatsApp client is not connected. Will retry when connected.');
    }

    if (!settings.enable_whatsapp_reminders) {
        logger.info('[whatsappService] WhatsApp reminders disabled — skipping');
        return { success: 0, failed: 0 };
    }

    const today = DateTime.now().toFormat('yyyy-MM-dd');

    const fmt = (d) => d ? DateTime.fromJSDate(new Date(d)).toFormat('yyyy-MM-dd') : null;

    const isGstFirst = fmt(settings.gst_reminder_1_date) === today;
    const isGstSecond = fmt(settings.gst_reminder_2_date) === today;
    const isTdsFirst = fmt(settings.tds_reminder_1_date) === today;
    const isTdsSecond = fmt(settings.tds_reminder_2_date) === today;

    const effectiveIsGst = reminderType ? reminderType.startsWith('gst') : (isGstFirst || isGstSecond);
    const effectiveIsTds = reminderType ? reminderType.startsWith('tds') : (isTdsFirst || isTdsSecond);

    if (!effectiveIsGst && !effectiveIsTds) {
        logger.info('[whatsappService] Today is not a scheduled reminder day — skipping');
        return { success: 0, failed: 0 };
    }

    const gstReminderNumber = isGstFirst ? 1 : (isGstSecond ? 2 : 0);
    const tdsReminderNumber = isTdsFirst ? 1 : (isTdsSecond ? 2 : 0);

    const gstDueDate = settings.gst_due_date ? DateTime.fromJSDate(new Date(settings.gst_due_date)) : null;
    const tdsDueDate = settings.tds_due_date ? DateTime.fromJSDate(new Date(settings.tds_due_date)) : null;
    const isGstPastDue = gstDueDate ? DateTime.now() > gstDueDate : false;
    const isTdsPastDue = tdsDueDate ? DateTime.now() > tdsDueDate : false;

    // Fetch clients with pending documents and WhatsApp group IDs
    const result = await db.query(`
    SELECT
      c.id, c.name, c.whatsapp_group_id,
      cd.document_month,
      cd.gst_1_received, cd.bank_statement_received, cd.tds_received,
      c.gst_1_enabled, c.bank_statement_enabled, c.tds_document_enabled
    FROM "user".clients c
    JOIN "user".client_documents cd ON c.id = cd.client_id
    WHERE c.whatsapp_group_id IS NOT NULL AND c.whatsapp_group_id <> ''
      AND (NOT cd.gst_1_received OR NOT cd.bank_statement_received OR NOT cd.tds_received)
      AND cd.document_month = TRIM(TO_CHAR((CURRENT_DATE - INTERVAL '1 month'), 'Month'))
                              || ' ' || EXTRACT(YEAR FROM (CURRENT_DATE - INTERVAL '1 month'))
  `);

    logger.info(`[whatsappService] ${result.rows.length} clients need WA reminders`);
    if (result.rows.length === 0) return { success: 0, failed: 0 };

    let successCount = 0;
    let failedCount = 0;

    for (const row of result.rows) {
        try {
            const needsGst = !row.gst_1_received && row.gst_1_enabled;
            const needsBank = !row.bank_statement_received && row.bank_statement_enabled;
            const needsTds = !row.tds_received && row.tds_document_enabled;

            if (!needsGst && !needsBank && !needsTds) continue;

            logger.info(`[whatsappService] Processing ${row.name}`);

            // Build doc arrays for GST and TDS reminder days
            const gstDocs = [];
            const tdsDocs = [];

            if (effectiveIsGst) {
                if (needsGst) gstDocs.push('GSTR 1 data');
                if (needsBank) gstDocs.push('Bank statement');
            }
            if (effectiveIsTds) {
                if (needsTds) tdsDocs.push('TDS data');
                // Bank statement goes with TDS if GST is not a reminder day
                if (needsBank && !effectiveIsGst) tdsDocs.push('Bank statement');
            }

            // GST-day send
            if (gstDocs.length > 0) {
                const ok = await sendReminderMessage(row, gstDocs, gstReminderNumber, settings.gst_due_date, isGstPastDue);
                if (ok) {
                    successCount++;
                    for (const doc of gstDocs) {
                        const type = doc.includes('GSTR') ? 'gst' : 'bank';
                        await updateReminderStatus(row.id, row.document_month, gstReminderNumber, type);
                    }
                } else {
                    failedCount++;
                }
            }

            // TDS-day send
            if (tdsDocs.length > 0) {
                const ok = await sendReminderMessage(row, tdsDocs, tdsReminderNumber, settings.tds_due_date, isTdsPastDue);
                if (ok) {
                    successCount++;
                    for (const doc of tdsDocs) {
                        const type = doc.includes('TDS') ? 'tds' : 'bank';
                        await updateReminderStatus(row.id, row.document_month, tdsReminderNumber, type);
                    }
                } else {
                    failedCount++;
                }
            }

            // Rate-limit guard (2–6s between messages)
            const delay = Math.floor(Math.random() * 4000) + 2000;
            await new Promise((r) => setTimeout(r, delay));

        } catch (err) {
            logger.error(`[whatsappService] Error processing ${row.name}: ${err.message}`);
            failedCount++;
        }
    }

    logger.info(`[whatsappService] Done — success: ${successCount}, failed: ${failedCount}`);
    return { success: successCount, failed: failedCount };
};

// ════════════════════════════════════════
// Private helpers
// ════════════════════════════════════════

/**
 * Build and send a reminder message for specific document types.
 */
async function sendReminderMessage(clientRow, pendingDocs, reminderNumber, dueDate, isPastDue) {
    const isUrgent = reminderNumber === 2 || isPastDue;
    const docList = pendingDocs.join(', ');

    const intro = isUrgent
        ? `*⚠️ URGENT REMINDER*\n\nDear sir,\n\nThis is an urgent reminder to submit your pending ${docList} for ${clientRow.document_month} immediately.`
        : `*📢 Gentle Reminder*\n\nDear sir,\n\nThis is a gentle reminder to submit your pending ${docList} for ${clientRow.document_month}.`;

    const dueDateStr = dueDate ? `\n\n*Due Date:* ${DateTime.fromJSDate(new Date(dueDate)).toFormat('dd MMMM yyyy')}` : '';
    const overdueNote = isPastDue ? '\n\n*Note:* This submission is now OVERDUE.' : '';
    const cta = '\n\nAct now to avoid late fees. Please ignore if documents have already been provided.';
    const footer = '\n\nNeed assistance? Contact us ASAP.\n\nThank you for your prompt attention 🤝\n\nBest regards,\nTeam HPRT\nM. No. 966 468 7247';

    const message = `${intro}${dueDateStr}${overdueNote}${cta}${footer}`;

    const ok = await sendGroupMessage(clientRow.whatsapp_group_id, message);
    if (ok) {
        await logWhatsAppMessage(clientRow.whatsapp_group_id, message, 'sent', null, clientRow.id);
        logger.info(`[whatsappService] Sent to ${clientRow.name}`);
    } else {
        await logWhatsAppMessage(clientRow.whatsapp_group_id, message, 'failed', 'Send failed', clientRow.id);
        logger.warn(`[whatsappService] Failed for ${clientRow.name}`);
    }
    return ok;
}

/**
 * Update reminder status columns in client_documents.
 */
async function updateReminderStatus(clientId, documentMonth, reminderNumber, documentType) {
    if (!reminderNumber || reminderNumber < 1) return;

    const prefixMap = { gst: 'gst_1_reminder_', tds: 'tds_reminder_', bank: 'bank_reminder_' };
    const prefix = prefixMap[documentType] || 'reminder_';

    try {
        await db.query(
            `UPDATE "user".client_documents
       SET ${prefix}${reminderNumber}_sent = TRUE,
           ${prefix}${reminderNumber}_sent_date = $3
       WHERE client_id = $1 AND document_month = $2`,
            [clientId, documentMonth, new Date().toISOString()]
        );
        logger.debug(`[whatsappService] Updated ${documentType} reminder ${reminderNumber} for client ${clientId}`);
    } catch (err) {
        logger.error(`[whatsappService] Failed to update reminder status: ${err.message}`);
    }
}

module.exports = {
    sendWhatsAppReminders,
    sendGroupMessage,
    logWhatsAppMessage,
};