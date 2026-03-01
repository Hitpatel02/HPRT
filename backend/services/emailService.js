/**
 * emailService.js — Phase 2 refactor
 *
 * sendEmailReminders() now accepts:
 *   - settings (Object)    — the reminder_settings row to use
 *   - reminderType (string) — 'gst_1' | 'gst_2' | 'tds_1' | 'tds_2' | 'email'
 *
 * This makes calls idempotent and scoped: the worker passes the exact settings
 * for the job it's processing. Falls back to latest settings if no object provided.
 */
const axios = require('axios');
const { DateTime } = require('luxon');
const { getToken } = require('../config/msGraph');
const loggingService = require('./loggingService');
const clientDocumentsQueries = require('../queries/clientDocumentsQueries');
const settingsQueries = require('../queries/settingsQueries');
const { logger } = require('../utils/logger');
const db = require('../config/db');

/**
 * Send email reminders to clients with pending documents.
 *
 * @param {Object|null} settings      - reminder_settings row. Fetched from DB if null.
 * @param {string|null} reminderType  - Type of reminder that triggered this call.
 *                                       'gst_1'|'gst_2'|'tds_1'|'tds_2' or generic 'email'.
 */
const sendEmailReminders = async (settings = null, reminderType = null) => {
  try {
    // ── Resolve settings ─────────────────────────────
    if (!settings) {
      settings = await settingsQueries.getLatestReminderSettings();
    }

    if (!settings) {
      logger.warn('[emailService] No reminder settings found. Skipping email reminders.');
      return;
    }

    // ── Check if email reminders are enabled ─────────
    if (!settings.enable_email_reminders) {
      logger.info('[emailService] Email reminders are disabled. Skipping.');
      return;
    }

    // ── Determine which reminder day this is ─────────
    const today = DateTime.now().toFormat('yyyy-MM-dd');

    const isGstFirstReminderDay = settings.gst_reminder_1_date &&
      DateTime.fromJSDate(new Date(settings.gst_reminder_1_date)).toFormat('yyyy-MM-dd') === today;
    const isGstSecondReminderDay = settings.gst_reminder_2_date &&
      DateTime.fromJSDate(new Date(settings.gst_reminder_2_date)).toFormat('yyyy-MM-dd') === today;
    const isTdsFirstReminderDay = settings.tds_reminder_1_date &&
      DateTime.fromJSDate(new Date(settings.tds_reminder_1_date)).toFormat('yyyy-MM-dd') === today;
    const isTdsSecondReminderDay = settings.tds_reminder_2_date &&
      DateTime.fromJSDate(new Date(settings.tds_reminder_2_date)).toFormat('yyyy-MM-dd') === today;

    const isGstReminderDay = isGstFirstReminderDay || isGstSecondReminderDay;
    const isTdsReminderDay = isTdsFirstReminderDay || isTdsSecondReminderDay;

    // For pg-boss-triggered jobs we trust the caller's reminderType;
    // for manual/fallback calls we check today's date
    const effectiveIsGst = reminderType ? reminderType.startsWith('gst') : isGstReminderDay;
    const effectiveIsTds = reminderType ? reminderType.startsWith('tds') : isTdsReminderDay;

    if (!effectiveIsGst && !effectiveIsTds) {
      logger.info('[emailService] Today is not a reminder day. Skipping email reminders.');
      return;
    }

    // ── Get Microsoft Graph token ────────────────────
    const authResponse = await getToken();
    const accessToken = authResponse.accessToken;

    // ── Fetch clients with pending documents ─────────
    const result = await db.query(
      `SELECT 
          c.id, 
          c.name, 
          c.email_id_1, 
          c.email_id_2, 
          c.email_id_3,
          cd.document_month,
          cd.gst_1_received,
          cd.bank_statement_received,
          cd.tds_received,
          c.gst_1_enabled,
          c.bank_statement_enabled,
          c.tds_document_enabled
       FROM "user".clients c
       JOIN "user".client_documents cd ON c.id = cd.client_id
       WHERE 
          (NOT cd.gst_1_received OR NOT cd.bank_statement_received OR NOT cd.tds_received)
          AND (c.email_id_1 IS NOT NULL OR c.email_id_2 IS NOT NULL OR c.email_id_3 IS NOT NULL)
          AND cd.document_month = TRIM(TO_CHAR((CURRENT_DATE - INTERVAL '1 month'), 'Month')) || ' ' || EXTRACT(YEAR FROM (CURRENT_DATE - INTERVAL '1 month'))`,
      []
    );

    logger.info(`[emailService] Found ${result.rows.length} clients needing email reminders.`);

    if (result.rows.length === 0) {
      logger.info('[emailService] No clients with pending documents found for today.');
      return;
    }

    const gstReminderNumber = isGstFirstReminderDay ? 1 : (isGstSecondReminderDay ? 2 : 0);
    const tdsReminderNumber = isTdsFirstReminderDay ? 1 : (isTdsSecondReminderDay ? 2 : 0);

    const graphClient = axios.create({
      baseURL: 'https://graph.microsoft.com/v1.0',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    const senderEmail = process.env.SENDER_EMAIL;

    // ── Process each client ──────────────────────────
    for (const client of result.rows) {
      try {
        if (!client.email_id_1 && !client.email_id_2 && !client.email_id_3) {
          logger.debug(`[emailService] No email addresses for client ${client.name}. Skipping.`);
          continue;
        }

        const recipients = [];
        if (client.email_id_1) recipients.push({ emailAddress: { address: client.email_id_1 } });
        if (client.email_id_2) recipients.push({ emailAddress: { address: client.email_id_2 } });
        if (client.email_id_3) recipients.push({ emailAddress: { address: client.email_id_3 } });

        const needsGst = !client.gst_1_received && client.gst_1_enabled;
        const needsBank = !client.bank_statement_received && client.bank_statement_enabled;
        const needsTds = !client.tds_received && client.tds_document_enabled;

        if (!needsGst && !needsBank && !needsTds) {
          logger.debug(`[emailService] All docs received for ${client.name}. Skipping.`);
          continue;
        }

        logger.info(`[emailService] Processing ${client.name} — GST:${needsGst} Bank:${needsBank} TDS:${needsTds}`);

        // ── Scenario: All 3 pending ─────────────────
        if (needsGst && needsBank && needsTds) {
          if (effectiveIsTds) {
            const docs = ['TDS data', 'Bank statement'].filter((_, i) => [needsTds, needsBank][i]);
            await sendDocumentEmail(graphClient, senderEmail, client, recipients, docs, tdsReminderNumber, settings.tds_due_date);
            if (tdsReminderNumber > 0) {
              if (needsTds) await updateReminderStatus(client.id, client.document_month, tdsReminderNumber, 'tds');
              if (needsBank) await updateReminderStatus(client.id, client.document_month, tdsReminderNumber, 'bank');
            }
          }
          if (effectiveIsGst) {
            await sendDocumentEmail(graphClient, senderEmail, client, recipients, ['GSTR 1 data'], gstReminderNumber, settings.gst_due_date);
            if (gstReminderNumber > 0) await updateReminderStatus(client.id, client.document_month, gstReminderNumber, 'gst');
          }
        }
        // ── Scenario: GST + TDS ─────────────────────
        else if (needsGst && needsTds && !needsBank) {
          if (effectiveIsGst) {
            await sendDocumentEmail(graphClient, senderEmail, client, recipients, ['GSTR 1 data'], gstReminderNumber, settings.gst_due_date);
            if (gstReminderNumber > 0) await updateReminderStatus(client.id, client.document_month, gstReminderNumber, 'gst');
          }
          if (effectiveIsTds) {
            await sendDocumentEmail(graphClient, senderEmail, client, recipients, ['TDS data'], tdsReminderNumber, settings.tds_due_date);
            if (tdsReminderNumber > 0) await updateReminderStatus(client.id, client.document_month, tdsReminderNumber, 'tds');
          }
        }
        // ── Scenario: GST + Bank ────────────────────
        else if (needsGst && needsBank && !needsTds) {
          if (effectiveIsGst) {
            const docs = ['GSTR 1 data', 'Bank statement'];
            await sendDocumentEmail(graphClient, senderEmail, client, recipients, docs, gstReminderNumber, settings.gst_due_date);
            if (gstReminderNumber > 0) {
              await updateReminderStatus(client.id, client.document_month, gstReminderNumber, 'gst');
              await updateReminderStatus(client.id, client.document_month, gstReminderNumber, 'bank');
            }
          }
        }
        // ── Scenario: TDS + Bank ────────────────────
        else if (!needsGst && needsTds && needsBank) {
          if (effectiveIsTds) {
            const docs = ['TDS data', 'Bank statement'];
            await sendDocumentEmail(graphClient, senderEmail, client, recipients, docs, tdsReminderNumber, settings.tds_due_date);
            if (tdsReminderNumber > 0) {
              await updateReminderStatus(client.id, client.document_month, tdsReminderNumber, 'tds');
              await updateReminderStatus(client.id, client.document_month, tdsReminderNumber, 'bank');
            }
          }
        }
        // ── Scenario: GST only ──────────────────────
        else if (needsGst && !needsBank && !needsTds) {
          if (effectiveIsGst) {
            await sendDocumentEmail(graphClient, senderEmail, client, recipients, ['GSTR 1 data'], gstReminderNumber, settings.gst_due_date);
            if (gstReminderNumber > 0) await updateReminderStatus(client.id, client.document_month, gstReminderNumber, 'gst');
          }
        }
        // ── Scenario: TDS only ──────────────────────
        else if (!needsGst && needsTds && !needsBank) {
          if (effectiveIsTds) {
            await sendDocumentEmail(graphClient, senderEmail, client, recipients, ['TDS data'], tdsReminderNumber, settings.tds_due_date);
            if (tdsReminderNumber > 0) await updateReminderStatus(client.id, client.document_month, tdsReminderNumber, 'tds');
          }
        }
        // ── Scenario: Bank only ─────────────────────
        else if (!needsGst && !needsTds && needsBank) {
          if (effectiveIsGst) {
            await sendDocumentEmail(graphClient, senderEmail, client, recipients, ['Bank statement'], gstReminderNumber, settings.gst_due_date);
            if (gstReminderNumber > 0) await updateReminderStatus(client.id, client.document_month, gstReminderNumber, 'bank');
          }
        }

        // Rate-limit guard
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        logger.error(`[emailService] Failed to process email for ${client.name}:`, error.response?.data || error.message);
      }
    }
  } catch (error) {
    logger.error('[emailService] Fatal error in sendEmailReminders:', error);
    throw error; // Re-throw so the worker can mark the job for retry
  }
};

// ════════════════════════════════════════
// Helpers
// ════════════════════════════════════════

async function logEmailToDatabase(clientId, emailTo, emailSubject, emailBody, reminderNumber, documentMonth, status = 'sent') {
  try {
    await loggingService.logEmail({
      client_id: clientId,
      to_email: emailTo,
      subject: emailSubject,
      body: emailBody,
      reminder_number: reminderNumber,
      document_month: documentMonth,
      status,
    });
  } catch (error) {
    logger.error('[emailService] Error logging email to DB:', error.message);
    // Attempt minimal log
    try {
      await loggingService.logEmail({ client_id: clientId, to_email: emailTo, status });
    } catch (minimalError) {
      logger.error('[emailService] Minimal email log also failed:', minimalError.message);
    }
  }
}

async function sendDocumentEmail(graphClient, senderEmail, client, recipients, pendingDocs, reminderNumber, dueDate) {
  if (pendingDocs.length === 0) return;

  const emailSubject = `Reminder to share ${pendingDocs.join(' and ')} for ${client.document_month} - ${client.name}`;
  const reminderType = reminderNumber === 2 ? '⚠️ URGENT REMINDER' : '📢 Gentle reminder';
  const dueDateStr = dueDate ? DateTime.fromJSDate(new Date(dueDate)).toFormat('dd MMMM yyyy') : 'the due date';

  const emailBody = `${reminderType} to share ${pendingDocs.join(' and ')} for the month of ${client.document_month}.

The Last date for submission is ${dueDateStr}.

Act now to avoid late fees. Ignore, if data is already provided.

Need assistance? Contact us ASAP.

Thank you for your prompt attention🤝.

Best regards
Team HPRT

M.No. 966 468 7247`;

  const message = {
    message: {
      subject: emailSubject,
      body: { contentType: 'Text', content: emailBody },
      toRecipients: recipients,
    },
    saveToSentItems: 'true',
  };

  await graphClient.post(`/users/${senderEmail}/sendMail`, message);
  logger.info(`[emailService] Email sent to ${client.name} (${recipients.map(r => r.emailAddress.address).join(', ')})`);

  const emailTo = recipients.map(r => r.emailAddress.address).join(', ');
  await logEmailToDatabase(client.id, emailTo, emailSubject, emailBody, reminderNumber, client.document_month);
}

async function updateReminderStatus(clientId, documentMonth, reminderNumber, documentType) {
  const prefixMap = { gst: 'gst_1_reminder_', tds: 'tds_reminder_', bank: 'bank_reminder_' };
  const columnPrefix = prefixMap[documentType] || 'reminder_';

  try {
    await clientDocumentsQueries.updateReminderStatus({
      client_id: clientId,
      document_month: documentMonth,
      reminder_number: reminderNumber,
      document_type: documentType,
      column_prefix: columnPrefix,
    });
    logger.debug(`[emailService] Updated ${documentType} reminder ${reminderNumber} for client ${clientId}`);
  } catch (error) {
    logger.error(`[emailService] Error updating ${documentType} reminder status: ${error.message}`);
  }
}

module.exports = { sendEmailReminders };
