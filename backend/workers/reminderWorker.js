/**
 * reminderWorker.js
 *
 * SEPARATE PROCESS — start this independently of the API server:
 *   node workers/reminderWorker.js
 * or via PM2 (see ecosystem.config.js)
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

// Max retries — keep in sync with whatever you set in reminderScheduler when sending the job
const MAX_RETRIES = 3;

// ════════════════════════════════════════
// Handle final failures (exhausted retries)
// ════════════════════════════════════════

async function handleFailedJob(job, lastError) {
    const { settingsId, reminderType } = job.data || {};
    logger.error(`[worker] Job ${job.id} failed permanently after all retries | type=${reminderType} | settingsId=${settingsId}`);

    if (settingsId && reminderType) {
        try {
            const jobs = await reminderJobQueries.getJobsBySettingsId(settingsId);
            const trackingRow = jobs.find(j => j.reminder_type === reminderType && j.status !== 'cancelled');
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
// Worker handler
// ════════════════════════════════════════

async function handleReminderJob(job) {
    const { settingsId, reminderType, immediate, scheduledFor } = job.data;
    const retryCount = job.retrycount ?? 0;
    const isFinalAttempt = retryCount >= MAX_RETRIES - 1;

    logger.info(`[worker] Processing job ${job.id} | type=${reminderType} | settingsId=${settingsId} | immediate=${!!immediate} | attempt=${retryCount + 1}/${MAX_RETRIES}`);

    // ── Fetch tracking row ─────────────────────────────
    let trackingRow = null;
    if (!immediate && settingsId && reminderType) {
        const jobs = await reminderJobQueries.getJobsBySettingsId(settingsId);
        trackingRow = jobs.find(j => j.reminder_type === reminderType && j.status !== 'cancelled');
    }

    // ── Idempotency guard ──────────────────────────────
    if (trackingRow && trackingRow.status === 'sent') {
        logger.info(`[worker] Job ${job.id} already marked as 'sent'. Skipping.`);
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
        logger.error(`[worker] ${msg}`);

        if (trackingRow) {
            // If final attempt, mark permanently failed; otherwise back to pending for retry
            await reminderJobQueries.updateJobStatus(trackingRow.id, {
                status: isFinalAttempt ? 'failed' : 'pending',
                last_error: msg,
                processed_at: isFinalAttempt ? new Date() : null,
            });
        }

        throw new Error(msg); // Always throw — pg-boss handles retry/failure based on retrycount
    }

    // ── Send reminders ─────────────────────────────────
    let emailSent = false;
    let whatsappSent = false;
    const errors = [];

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

            // WhatsApp
            if (settings.enable_whatsapp_reminders || reminderType === 'whatsapp') {
                try {
                    if (!whatsappClient.isReady()) {
                        throw new Error('WhatsApp client is not connected — will retry');
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
        const allFailed = errors.length > 0 && !emailSent && !whatsappSent;

        if (allFailed) {
            if (isFinalAttempt) {
                // Final attempt — mark permanently failed, don't throw
                await handleFailedJob(job, errors.join('; '));
            } else {
                // More retries remaining — reset to pending and throw to trigger retry
                await reminderJobQueries.updateJobStatus(trackingRow.id, {
                    status: 'pending',
                    last_error: errors.join('; '),
                });
                throw new Error(errors.join('; '));
            }
        } else {
            // At least one channel succeeded
            await reminderJobQueries.updateJobStatus(trackingRow.id, {
                status: 'sent',
                processed_at: new Date(),
                last_error: errors.length > 0 ? errors.join('; ') : null,
            });
        }
    }

    logger.info(`[worker] Job ${job.id} completed successfully`);
}

// ════════════════════════════════════════
// Bootstrap
// ════════════════════════════════════════

async function start() {
    logger.info('[worker] Starting reminder worker...');

    await reminderJobQueries.ensureTable();
    logger.info('[worker] reminder_jobs table verified');

    const boss = await getBoss();

    // ✅ Create queue explicitly (required in pg-boss v9+)
    await boss.createQueue(JOB_NAME);

    // ✅ Single worker registration
    await boss.work(JOB_NAME, { teamSize: 1, teamConcurrency: 1 }, handleReminderJob);

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
