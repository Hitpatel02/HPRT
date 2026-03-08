/**
 * reminderWorker.js
 *
 * SEPARATE PROCESS — start independently of the API server:
 *   node workers/reminderWorker.js
 * or via PM2 (see ecosystem.config.js)
 *
 * Registers TWO separate handlers:
 *   send-email-reminder    → handleEmailReminderJob    (sends directly)
 *   send-whatsapp-reminder → handleWhatsAppReminderJob (calls backend HTTP)
 *
 * WHY the WhatsApp handler calls HTTP instead of using whatsappClient directly:
 *   This worker is a separate OS process from the backend server.
 *   The WhatsApp client (whatsapp-web.js) is initialized and lives in the
 *   backend process memory. Calling whatsappClient.isReady() here always
 *   returns false because this process never initializes WhatsApp.
 *   Fix: call POST /api/internal/send-whatsapp-reminder on the backend,
 *   which uses its own in-memory connected client to send the messages.
 *   If WhatsApp is not connected, backend returns 503 → worker throws →
 *   pg-boss retries after retryDelay (5 minutes).
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const axios = require('axios');
const { getBoss, stopBoss } = require('../jobs/boss');
const { EMAIL_JOB_NAME, WA_JOB_NAME } = require('../jobs/reminderScheduler');
const { logger } = require('../utils/logger');
const reminderJobQueries = require('../queries/reminderJobQueries');
const settingsQueries = require('../queries/settingsQueries');
const { sendEmailReminders } = require('../services/emailService');
const { generateMonthlyReport } = require('../services/reportService');

const MAX_RETRIES = 5;

// ── Internal API config ────────────────────────────────────────────────────
// The backend runs on this port. Worker calls it for WhatsApp sends.
const BACKEND_PORT = process.env.PORT || 8080;
const BACKEND_URL = `http://localhost:${BACKEND_PORT}`;
const INTERNAL_KEY = process.env.INTERNAL_API_KEY || 'hprt-internal-secret-2024';

// ════════════════════════════════════════
// Handle final failures (exhausted retries)
// ════════════════════════════════════════

async function handleFailedJob(job, lastError, channel) {
    const { settingsId, reminderType } = job.data || {};
    logger.error(
        `[worker] Job ${job.id} failed permanently | type=${reminderType} | channel=${channel} | settingsId=${settingsId}`
    );

    if (settingsId && reminderType) {
        try {
            const trackingRow = await reminderJobQueries.findJobByTypeAndChannel(
                settingsId, reminderType, channel
            );
            if (trackingRow) {
                await reminderJobQueries.updateJobStatus(trackingRow.id, {
                    status: 'failed',
                    last_error: `Exhausted all retries. Last error: ${lastError || 'Unknown'}`,
                    processed_at: new Date(),
                });
            }
        } catch (err) {
            logger.error('[worker] Failed to update tracking row for exhausted job:', err.message);
        }
    }
}

// ════════════════════════════════════════
// Shared processing logic
// ════════════════════════════════════════

/**
 * Common handler used by both email and WhatsApp job handlers.
 *
 * @param {Object|Array} jobs  - pg-boss v12 passes an array of jobs
 * @param {string} channel     - 'email' | 'whatsapp'
 * @param {Function} sendFn    - async (settings, reminderType) => void
 *                               Must throw on failure so pg-boss retries.
 */
async function processReminderJob(jobs, channel, sendFn) {
    // pg-boss v12 passes an array even for single jobs
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

    logger.info(
        `[worker:${channel}] Processing job ${job.id} | type=${reminderType} | settingsId=${settingsId} | immediate=${!!immediate} | attempt=${retryCount + 1}/${MAX_RETRIES}`
    );

    // ── Fetch tracking row ─────────────────────────────────────────────────
    let trackingRow = null;
    if (!immediate && settingsId && reminderType) {
        trackingRow = await reminderJobQueries.findJobByTypeAndChannel(
            settingsId, reminderType, channel
        );
    }

    // ── Idempotency guard ──────────────────────────────────────────────────
    if (trackingRow && trackingRow.status === 'sent') {
        logger.info(`[worker:${channel}] Job ${job.id} already marked as sent — skipping`);
        return;
    }

    // ── Mark as processing ─────────────────────────────────────────────────
    if (trackingRow) {
        await reminderJobQueries.updateJobStatus(trackingRow.id, {
            status: 'processing',
            attempts: (trackingRow.attempts || 0) + 1,
        });
    }

    // ── Fetch settings (email handler needs this; WA handler passes it via HTTP) ──
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
        throw new Error(msg);
    }

    // ── Send ───────────────────────────────────────────────────────────────
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

    // ── Mark sent ──────────────────────────────────────────────────────────
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
// Email handler — runs directly in worker process
// ════════════════════════════════════════

async function handleEmailReminderJob(jobs) {
    await processReminderJob(jobs, 'email', async (settings, reminderType) => {
        // Monthly report is routed through the email queue
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
// WhatsApp handler — calls backend HTTP endpoint
// ════════════════════════════════════════
//
// The WhatsApp client lives in the BACKEND process memory, not here.
// We must call the backend over HTTP so it uses its own connected client.
// If WhatsApp is not connected, backend returns HTTP 503 → we throw →
// pg-boss retries after retryDelay seconds.

async function handleWhatsAppReminderJob(jobs) {
    await processReminderJob(jobs, 'whatsapp', async (settings, reminderType) => {
        logger.info(`[worker:whatsapp] Calling backend to send WhatsApp reminders (type=${reminderType})...`);

        let response;
        try {
            response = await axios.post(
                `${BACKEND_URL}/api/internal/send-whatsapp-reminder`,
                {
                    settingsId: settings.id,
                    reminderType,
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'x-internal-key': INTERNAL_KEY,
                    },
                    // 2-minute timeout — WhatsApp sends can be slow
                    timeout: 120000,
                }
            );
        } catch (err) {
            // Axios throws on network error or non-2xx response
            const status = err.response?.status;
            const message = err.response?.data?.message || err.message;

            if (status === 503) {
                // WhatsApp not connected — pg-boss will retry
                throw new Error(`WhatsApp client is not connected — pg-boss will retry in 5 minutes`);
            }

            if (status === 404) {
                // Settings not found — no point retrying
                logger.error(`[worker:whatsapp] Settings not found on backend — skipping retries`);
                throw new Error(`Settings not found: ${message}`);
            }

            // Any other error — throw so pg-boss retries
            throw new Error(`Backend call failed (HTTP ${status || 'no response'}): ${message}`);
        }

        // Successful response
        const result = response.data?.result || {};
        logger.info(
            `[worker:whatsapp] WhatsApp reminders sent via backend | success=${result.success ?? '?'} | failed=${result.failed ?? '?'}`
        );
    });
}

// ════════════════════════════════════════
// Bootstrap
// ════════════════════════════════════════

async function start() {
    logger.info('[worker] Starting reminder worker...');

    // Ensure DB table + migrations are applied
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

    // Keep process alive (PM2 handles SIGTERM/SIGINT on Linux)
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
        logger.error('[worker] Error during shutdown:', err.message);
    }
    process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
    logger.error('[worker] Unhandled rejection:', String(reason));
});

process.on('uncaughtException', (err) => {
    logger.error('[worker] Uncaught exception:', err.message);
    process.exit(1);
});

start().catch((err) => {
    logger.error('[worker] Fatal startup error:', err.message);
    process.exit(1);
});
