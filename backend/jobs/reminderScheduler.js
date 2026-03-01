/**
 * reminderScheduler.js
 *
 * Calculates the exact fire datetime from reminder_settings and schedules
 * pg-boss jobs. Called by settingsController whenever settings are saved.
 *
 * NOT the worker — this file only enqueues jobs; it runs inside the API server process.
 */
const { getBoss } = require('./boss');
const { logger } = require('../utils/logger');
const reminderJobQueries = require('../queries/reminderJobQueries');

/** Name used for all reminder jobs in pg-boss */
const JOB_NAME = 'send-reminder';

/**
 * Convert a DATE value and scheduler time into an exact Date object.
 *
 * @param {string|Date} reminderDate    - Date from DB (e.g. "2026-03-15" or Date object)
 * @param {number}      schedulerHour   - Hour in 12-hour format (1-12)
 * @param {number}      schedulerMinute - Minute (0–59)
 * @param {string}      schedulerAmPm   - 'AM' | 'PM'
 * @returns {Date|null} Combined datetime or null if date is falsy
 */
function buildReminderDate(reminderDate, schedulerHour, schedulerMinute, schedulerAmPm) {
    if (!reminderDate) return null;

    const date = new Date(reminderDate);
    if (isNaN(date.getTime())) return null;

    // Convert 12h → 24h
    let hour24 = schedulerHour;
    if (schedulerAmPm === 'PM' && schedulerHour !== 12) hour24 = schedulerHour + 12;
    if (schedulerAmPm === 'AM' && schedulerHour === 12) hour24 = 0;

    date.setHours(hour24, schedulerMinute || 0, 0, 0);
    return date;
}

/**
 * Schedule all four reminder jobs from a settings record.
 * Skips any reminder type that already has a non-failed, non-cancelled job.
 * Jobs in the past are skipped (cannot schedule backward in time).
 *
 * @param {Object} settings - Row from reminder_settings table
 */
async function scheduleRemindersFromSettings(settings) {
    if (!settings || !settings.id) {
        logger.warn('[reminderScheduler] scheduleRemindersFromSettings called with no settings');
        return;
    }

    const boss = await getBoss();
    const now = new Date();

    const { scheduler_hour, scheduler_minute, scheduler_am_pm } = settings;

    const reminderMap = [
        { type: 'gst_1', dateField: settings.gst_reminder_1_date },
        { type: 'gst_2', dateField: settings.gst_reminder_2_date },
        { type: 'tds_1', dateField: settings.tds_reminder_1_date },
        { type: 'tds_2', dateField: settings.tds_reminder_2_date },
    ];

    for (const { type, dateField } of reminderMap) {
        if (!dateField) {
            logger.debug(`[reminderScheduler] Skipping ${type} — no date set`);
            continue;
        }

        const scheduledFor = buildReminderDate(dateField, scheduler_hour, scheduler_minute, scheduler_am_pm);

        if (!scheduledFor) {
            logger.warn(`[reminderScheduler] Could not parse date for ${type}: ${dateField}`);
            continue;
        }

        if (scheduledFor <= now) {
            logger.info(`[reminderScheduler] Skipping ${type} — scheduled time ${scheduledFor.toISOString()} is in the past`);
            continue;
        }

        // Idempotency: don't enqueue if a valid job already exists for this settings+type
        const alreadyExists = await reminderJobQueries.jobExistsForType(settings.id, type);
        if (alreadyExists) {
            logger.info(`[reminderScheduler] Skipping ${type} — job already scheduled for settingsId=${settings.id}`);
            continue;
        }

        // Payload carried by the job — the worker uses this to fetch and send
        const payload = {
            settingsId: settings.id,
            reminderType: type,
            scheduledFor: scheduledFor.toISOString(),
        };

        // Send to pg-boss with retry config
        const bossJobId = await boss.send(JOB_NAME, payload, {
            startAfter: scheduledFor,
            retryLimit: 5,
            retryDelay: 60,        // Start with 60 seconds
            retryBackoff: true,    // Exponential: 60s, 120s, 240s, 480s, 960s
            expireInHours: 24,     // Job expires after 24 hours if not picked up
        });

        // Track in our own table
        await reminderJobQueries.createJob({
            settings_id: settings.id,
            reminder_type: type,
            scheduled_for: scheduledFor,
            boss_job_id: bossJobId,
        });

        logger.info(`[reminderScheduler] Scheduled ${type} reminder for ${scheduledFor.toISOString()} (boss job: ${bossJobId})`);
    }
}

/**
 * Cancel all pending reminder jobs for a settings record.
 * Typically called when settings are deleted.
 *
 * @param {number} settingsId
 */
async function cancelRemindersForSettings(settingsId) {
    const jobs = await reminderJobQueries.getJobsBySettingsId(settingsId);
    const boss = await getBoss();

    let cancelled = 0;
    for (const job of jobs) {
        if (job.boss_job_id && ['pending', 'processing'].includes(job.status)) {
            try {
                await boss.cancel(JOB_NAME, job.boss_job_id);
            } catch (err) {
                logger.warn(`[reminderScheduler] Could not cancel pg-boss job ${job.boss_job_id}: ${err.message}`);
            }
        }
    }

    cancelled = await reminderJobQueries.cancelJobsBySettingsId(settingsId);
    logger.info(`[reminderScheduler] Cancelled ${cancelled} reminder jobs for settingsId=${settingsId}`);
}

/**
 * Enqueue an immediate job of a given type (for manual triggers).
 *
 * @param {string} reminderType - 'email' | 'whatsapp' | 'report' (maps to pg-boss job name)
 * @param {Object} [payload]    - Optional extra payload
 */
async function triggerImmediately(reminderType, payload = {}) {
    const boss = await getBoss();
    const jobId = await boss.send(JOB_NAME, { reminderType, ...payload, immediate: true }, {
        startAfter: new Date(),
        retryLimit: 3,
        retryDelay: 30,
        retryBackoff: true,
    });
    logger.info(`[reminderScheduler] Triggered immediate job: type=${reminderType}, bossJobId=${jobId}`);
    return jobId;
}

module.exports = {
    scheduleRemindersFromSettings,
    cancelRemindersForSettings,
    triggerImmediately,
    JOB_NAME,
};
