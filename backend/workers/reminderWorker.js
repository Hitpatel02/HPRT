/**
 * reminderWorker.js
 *
 * SEPARATE PROCESS — start this independently of the API server:
 *   node workers/reminderWorker.js
 * or via PM2 (see ecosystem.config.js)
 *
 * Responsibilities:
 *   - Connect to pg-boss
 *   - Listen for 'send-reminder' jobs
 *   - Fetch settings, check idempotency, send email + WhatsApp
 *   - Update reminder_jobs status after each attempt
 *   - Mark final failure when retries are exhausted
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { getBoss, stopBoss } = require('../jobs/boss');
const { JOB_NAME } = require('../jobs/reminderScheduler');
const { logger } = require('../utils/logger');
const reminderJobQueries = require('../queries/reminderJobQueries');
const settingsQueries = require('../queries/settingsQueries');
const { sendEmailReminders } = require('../services/emailService');
const { sendWhatsAppReminders } = require('../services/whatsappService');
const whatsappClient = require('../config/whatsappClient');
const { generateMonthlyReport } = require('../services/reportService');

// ════════════════════════════════════════
// Worker handler
// ════════════════════════════════════════

/**
 * Process a single 'send-reminder' job.
 *
 * @param {Object} job - pg-boss job object
 * @param {Object} job.data - Payload sent by reminderScheduler
 */
async function handleReminderJob(job) {
    const { settingsId, reminderType, immediate, scheduledFor } = job.data;

    logger.info(`[worker] Processing job ${job.id} | type=${reminderType} | settingsId=${settingsId} | immediate=${!!immediate}`);

    // ── Fetch our tracking row ──────────────────────────
    // For immediate/manual triggers there is no tracking row; skip idempotency check
    let trackingRow = null;
    if (!immediate && settingsId && reminderType) {
        const jobs = await reminderJobQueries.getJobsBySettingsId(settingsId);
        trackingRow = jobs.find(j => j.reminder_type === reminderType && j.status !== 'cancelled');
    }

    // ── Idempotency guard ──────────────────────────────
    if (trackingRow && trackingRow.status === 'sent') {
        logger.info(`[worker] Job ${job.id} already marked as 'sent'. Skipping.`);
        return; // Tell pg-boss: success (no retry needed)
    }

    // ── Mark as processing ─────────────────────────────
    if (trackingRow) {
        await reminderJobQueries.updateJobStatus(trackingRow.id, {
            status: 'processing',
            attempts: (trackingRow.attempts || 0) + 1,
        });
    }

    // ── Fetch settings ─────────────────────────────────
    const settings = settingsId
        ? await settingsQueries.getReminderSettingsById(settingsId)
        : await settingsQueries.getLatestReminderSettings();

    if (!settings) {
        const msg = `[worker] No settings found for settingsId=${settingsId}`;
        logger.error(msg);
        if (trackingRow) {
            await reminderJobQueries.updateJobStatus(trackingRow.id, {
                status: 'failed',
                last_error: msg,
                processed_at: new Date(),
            });
        }
        // Throw so pg-boss will retry
        throw new Error(msg);
    }

    // ── Determine what to send ─────────────────────────
    // reminderType: 'gst_1' | 'gst_2' | 'tds_1' | 'tds_2' | 'email' | 'whatsapp' | 'report'
    let emailSent = false;
    let whatsappSent = false;
    let errors = [];

    try {
        if (reminderType === 'report') {
            logger.info('[worker] Generating monthly report...');
            await generateMonthlyReport();
            logger.info('[worker] Monthly report generated');
        } else {
            // Email
            if (settings.enable_email_reminders || reminderType === 'email') {
                try {
                    logger.info(`[worker] Sending email reminders (type=${reminderType})...`);
                    await sendEmailReminders(settings, reminderType);
                    emailSent = true;
                    logger.info('[worker] Email reminders sent successfully');
                } catch (err) {
                    const msg = `Email send failed: ${err.message}`;
                    logger.error(`[worker] ${msg}`);
                    errors.push(msg);
                }
            }

            // WhatsApp — check connection before attempting
            if (settings.enable_whatsapp_reminders || reminderType === 'whatsapp') {
                try {
                    if (!whatsappClient.isReady()) {
                        // Throw so pg-boss retries — user must connect WA before reminder time
                        throw new Error('WhatsApp client is not connected — pg-boss will retry');
                    }
                    logger.info(`[worker] Sending WhatsApp reminders (type=${reminderType})...`);
                    await sendWhatsAppReminders(settings, reminderType);
                    whatsappSent = true;
                    logger.info('[worker] WhatsApp reminders sent successfully');
                } catch (err) {
                    const msg = `WhatsApp send failed: ${err.message}`;
                    logger.error(`[worker] ${msg}`);
                    errors.push(msg);
                }
            }
        }
    } catch (err) {
        errors.push(err.message);
    }

    // ── Update tracking row ────────────────────────────
    if (trackingRow) {
        if (errors.length > 0 && !emailSent && !whatsappSent) {
            // Both channels failed — throw so pg-boss retries
            await reminderJobQueries.updateJobStatus(trackingRow.id, {
                status: 'pending',   // Back to pending so next attempt can reset to processing
                last_error: errors.join('; '),
            });
            throw new Error(errors.join('; '));
        }

        await reminderJobQueries.updateJobStatus(trackingRow.id, {
            status: 'sent',
            processed_at: new Date(),
            last_error: errors.length > 0 ? errors.join('; ') : null,
        });
    }

    logger.info(`[worker] Job ${job.id} completed successfully`);
}

// ════════════════════════════════════════
// Handle final failures (exhausted retries)
// ════════════════════════════════════════

/**
 * Called by pg-boss when a job has exhausted all retries.
 */
async function handleFailedJob(job) {
    const { settingsId, reminderType } = job.data || {};
    logger.error(`[worker] Job ${job.id} failed permanently after all retries | type=${reminderType} | settingsId=${settingsId}`);

    if (settingsId && reminderType) {
        try {
            const jobs = await reminderJobQueries.getJobsBySettingsId(settingsId);
            const trackingRow = jobs.find(j => j.reminder_type === reminderType && j.status !== 'cancelled');
            if (trackingRow) {
                await reminderJobQueries.updateJobStatus(trackingRow.id, {
                    status: 'failed',
                    last_error: `Exhausted all retries. Last error: ${job.output?.message || 'Unknown'}`,
                    processed_at: new Date(),
                });
            }
        } catch (err) {
            logger.error('[worker] Failed to update tracking row for exhausted job:', err);
        }
    }
}

// ════════════════════════════════════════
// Bootstrap
// ════════════════════════════════════════

async function start() {
    logger.info('[worker] Starting reminder worker...');

    // Ensure reminder_jobs table exists before processing any jobs
    await reminderJobQueries.ensureTable();
    logger.info('[worker] reminder_jobs table verified');

    const boss = await getBoss();

    // Register handler — teamSize:1 prevents concurrent job processing
    await boss.work(JOB_NAME, { teamSize: 1, teamConcurrency: 1 }, handleReminderJob);

    // Register failure hook for exhausted retries
    await boss.onComplete(JOB_NAME, async (job) => {
        if (job.data.state === 'failed') {
            await handleFailedJob(job);
        }
    });

    logger.info(`[worker] Listening for '${JOB_NAME}' jobs`);
}

// ════════════════════════════════════════
// Graceful shutdown
// ════════════════════════════════════════

async function shutdown(signal) {
    logger.info(`[worker] ${signal} received — shutting down gracefully`);
    try {
        await stopBoss();
    } catch (err) {
        logger.error('[worker] Error during shutdown:', err);
    }
    process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
    logger.error('[worker] Unhandled rejection:', reason);
});

process.on('uncaughtException', (err) => {
    logger.error('[worker] Uncaught exception:', err);
    process.exit(1);
});

// ── Start ──────────────────────────────
start().catch((err) => {
    logger.error('[worker] Fatal startup error:', err);
    process.exit(1);
});
