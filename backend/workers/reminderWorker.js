/**
 * reminderWorker.js
 *
 * SEPARATE PROCESS — start this independently of the API server:
 *   node workers/reminderWorker.js
 * or via PM2 (see ecosystem.config.js)
 *
 * Registers TWO separate handlers:
 *   send-email-reminder    → handleEmailReminderJob
 *   send-whatsapp-reminder → handleWhatsAppReminderJob
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { getBoss, stopBoss } = require('../jobs/boss');
const { EMAIL_JOB_NAME, WA_JOB_NAME } = require('../jobs/reminderScheduler');
const { logger } = require('../utils/logger');
const reminderJobQueries = require('../queries/reminderJobQueries');
const settingsQueries = require('../queries/settingsQueries');
const { sendEmailReminders } = require('../services/emailService');
const { sendWhatsAppReminders } = require('../services/whatsappService');
const whatsappClient = require('../config/whatsappClient');
const { generateMonthlyReport } = require('../services/reportService');

const MAX_RETRIES = 5;

// ════════════════════════════════════════
// Handle final failures (exhausted retries)
// ════════════════════════════════════════

async function handleFailedJob(job, lastError, channel) {
    const { settingsId, reminderType } = job.data || {};
    logger.error(`[worker] Job ${job.id} failed permanently | type=${reminderType} | channel=${channel} | settingsId=${settingsId}`);

    if (settingsId && reminderType) {
        try {
            const trackingRow = await reminderJobQueries.findJobByTypeAndChannel(settingsId, reminderType, channel);
            if (trackingRow) {
                await reminderJobQueries.updateJobStatus(trackingRow.id, {
                    status: 'failed',
                    last_error: `Exhausted all retries. Last error: ${lastError || 'Unknown'}`,
                    processed_at: new Date(),
                });
            }
        } catch (err) {
            logger.error('[worker] Failed to update tracking row for exhausted job:', err);
        }
    }
}

// ════════════════════════════════════════
// Shared processing logic
// ════════════════════════════════════════

/**
 * Common handler logic used by both email and WhatsApp handlers.
 *
 * @param {Object} jobs     - pg-boss job array (unwrapped internally)
 * @param {string} channel  - 'email' | 'whatsapp'
 * @param {Function} sendFn - async (settings, reminderType) => void
 *                            Should throw if send fails — pg-boss will retry.
 */
async function processReminderJob(jobs, channel, sendFn) {
    // ── Unwrap array — pg-boss v12 passes an array even for single jobs ──
    const job = Array.isArray(jobs) ? jobs[0] : jobs;

    if (!job || !job.data) {
        logger.error(`[worker:${channel}] Received job with missing or empty data — skipping`);
        return;
    }

    const { settingsId, reminderType, immediate } = job.data;

    if (!reminderType) {
        logger.error(`[worker:${channel}] Job ${job.id} missing reminderType — skipping`);
        return;
    }

    const retryCount = job.retrycount ?? 0;
    const isFinalAttempt = retryCount >= MAX_RETRIES - 1;

    logger.info(`[worker:${channel}] Processing job ${job.id} | type=${reminderType} | settingsId=${settingsId} | immediate=${!!immediate} | attempt=${retryCount + 1}/${MAX_RETRIES}`);

    // ── Fetch tracking row ─────────────────────────────
    let trackingRow = null;
    if (!immediate && settingsId && reminderType) {
        trackingRow = await reminderJobQueries.findJobByTypeAndChannel(settingsId, reminderType, channel);
    }

    // ── Idempotency guard ──────────────────────────────
    if (trackingRow && trackingRow.status === 'sent') {
        logger.info(`[worker:${channel}] Job ${job.id} already marked as sent — skipping`);
        return;
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
        const msg = `No settings found for settingsId=${settingsId}`;
        logger.error(`[worker:${channel}] ${msg}`);

        if (trackingRow) {
            await reminderJobQueries.updateJobStatus(trackingRow.id, {
                status: isFinalAttempt ? 'failed' : 'pending',
                last_error: msg,
                processed_at: isFinalAttempt ? new Date() : null,
            });
        }

        throw new Error(msg); // pg-boss will retry
    }

    // ── Send ───────────────────────────────────────────
    try {
        await sendFn(settings, reminderType);
    } catch (err) {
        const msg = err.message || String(err);
        logger.error(`[worker:${channel}] Send failed: ${msg}`);

        if (trackingRow) {
            if (isFinalAttempt) {
                await handleFailedJob(job, msg, channel);
            } else {
                await reminderJobQueries.updateJobStatus(trackingRow.id, {
                    status: 'pending',
                    last_error: msg,
                });
            }
        }

        throw err; // pg-boss will retry
    }

    // ── Mark sent ──────────────────────────────────────
    if (trackingRow) {
        await reminderJobQueries.updateJobStatus(trackingRow.id, {
            status: 'sent',
            processed_at: new Date(),
            last_error: null,
        });
    }

    logger.info(`[worker:${channel}] Job ${job.id} completed successfully`);
}

// ════════════════════════════════════════
// Email handler
// ════════════════════════════════════════

async function handleEmailReminderJob(jobs) {
    await processReminderJob(jobs, 'email', async (settings, reminderType) => {
        // For 'report' type jobs routed through email queue
        if (reminderType === 'report') {
            logger.info('[worker:email] Generating monthly report...');
            await generateMonthlyReport();
            logger.info('[worker:email] Monthly report generated');
            return;
        }

        logger.info(`[worker:email] Sending email reminders (type=${reminderType})...`);
        await sendEmailReminders(settings, reminderType);
        logger.info('[worker:email] Email reminders sent successfully');
    });
}

// ════════════════════════════════════════
// WhatsApp handler
// ════════════════════════════════════════

async function handleWhatsAppReminderJob(jobs) {
    await processReminderJob(jobs, 'whatsapp', async (settings, reminderType) => {
        // Guard: WA must be connected — throw so pg-boss retries (retryDelay=300s)
        if (!whatsappClient.isReady()) {
            throw new Error('WhatsApp client is not connected — pg-boss will retry in 5 minutes');
        }

        logger.info(`[worker:whatsapp] Sending WhatsApp reminders (type=${reminderType})...`);
        await sendWhatsAppReminders(settings, reminderType);
        logger.info('[worker:whatsapp] WhatsApp reminders sent successfully');
    });
}

// ════════════════════════════════════════
// Bootstrap
// ════════════════════════════════════════

async function start() {
    logger.info('[worker] Starting reminder worker...');

    await reminderJobQueries.ensureTable();
    logger.info('[worker] reminder_jobs table verified (migrations applied)');

    const boss = await getBoss();

    // Register both queues
    await boss.createQueue(EMAIL_JOB_NAME);
    await boss.createQueue(WA_JOB_NAME);

    // Register both handlers
    await boss.work(EMAIL_JOB_NAME, handleEmailReminderJob);
    await boss.work(WA_JOB_NAME, handleWhatsAppReminderJob);

    logger.info(`[worker] Listening for '${EMAIL_JOB_NAME}' and '${WA_JOB_NAME}' jobs`);

    // Keep process alive on Windows (dev) and Linux/PM2 (production)
    await new Promise(() => { });
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

start().catch((err) => {
    logger.error('[worker] Fatal startup error:', err);
    process.exit(1);
});