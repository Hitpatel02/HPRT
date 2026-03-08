/**
 * reminderScheduler.js
 *
 * Calculates the exact fire datetime from reminder_settings and schedules
 * pg-boss jobs. Called by settingsController whenever settings are saved.
 *
 * NOT the worker — this file only enqueues jobs; it runs inside the API server process.
 *
 * RULE: Always reschedule on every call.
 *   Even if a job was already 'sent', we cancel + delete + re-create it.
 *   This lets settings changes take effect immediately, including for testing.
 *
 * Two separate job types:
 *   send-email-reminder    — handled by handleEmailReminderJob in the worker
 *   send-whatsapp-reminder — handled by handleWhatsAppReminderJob in the worker
 */
const { getBoss } = require('./boss');
const { logger } = require('../utils/logger');
const reminderJobQueries = require('../queries/reminderJobQueries');

/** Job name constants */
const EMAIL_JOB_NAME = 'send-email-reminder';
const WA_JOB_NAME = 'send-whatsapp-reminder';

/** Keep JOB_NAME as a legacy alias so other files that import it don't break */
const JOB_NAME = EMAIL_JOB_NAME;

/** Channel → pg-boss job name mapping */
const CHANNEL_JOB_NAME = {
    email: EMAIL_JOB_NAME,
    whatsapp: WA_JOB_NAME,
};

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

    // Parse date string directly to avoid timezone shifts.
    // PostgreSQL DATE columns arrive as either a plain string "2026-03-08"
    // or as a JS Date object set to UTC midnight-ish (e.g. 2026-03-07T18:30:00.000Z
    // for IST midnight). Using .getUTCDate() on the latter gives the wrong day.
    // Solution: convert any Date object to an IST wall-clock date string first.
    let dateStr;
    if (reminderDate instanceof Date) {
        if (isNaN(reminderDate.getTime())) return null;
        // Shift to IST (+5:30) to read the correct calendar date
        const istOffset = (5 * 60 + 30) * 60 * 1000;
        const istDate = new Date(reminderDate.getTime() + istOffset);
        dateStr = istDate.toISOString().slice(0, 10); // "YYYY-MM-DD" in IST
    } else {
        // Accept "2026-03-08" or "2026-03-08T18:30:00.000Z" — take first 10 chars
        dateStr = String(reminderDate).slice(0, 10);
    }

    const [year, month, day] = dateStr.split('-').map(Number);
    if (!year || !month || !day) return null;

    // Convert 12h → 24h
    let hour24 = Number(schedulerHour);
    if (schedulerAmPm === 'PM' && hour24 !== 12) hour24 += 12;
    if (schedulerAmPm === 'AM' && hour24 === 12) hour24 = 0;

    const minute = Number(schedulerMinute) || 0;

    // User enters time in IST (UTC+5:30); subtract 330 min to convert to UTC.
    // Handle negative result → means the UTC time falls on the previous calendar day.
    const istOffsetMinutes = 330;
    const totalISTMinutes = hour24 * 60 + minute;
    let utcTotalMinutes = totalISTMinutes - istOffsetMinutes;

    let utcYear = year;
    let utcMonth = month - 1; // JS months are 0-indexed
    let utcDay = day;

    let utcHour = Math.floor(utcTotalMinutes / 60);
    let utcMinute = utcTotalMinutes % 60;
    if (utcMinute < 0) { utcMinute += 60; utcHour -= 1; }

    if (utcHour < 0) {
        // Roll back one calendar day
        const tempDate = new Date(Date.UTC(year, month - 1, day));
        tempDate.setUTCDate(tempDate.getUTCDate() - 1);
        utcYear = tempDate.getUTCFullYear();
        utcMonth = tempDate.getUTCMonth();
        utcDay = tempDate.getUTCDate();
        utcHour += 24;
    }

    const result = new Date(Date.UTC(utcYear, utcMonth, utcDay, utcHour, utcMinute, 0, 0));
    if (isNaN(result.getTime())) return null;
    return result;
}

/**
 * Schedule all four reminder jobs from a settings record.
 *
 * ALWAYS reschedules — even if a job was already 'sent'.
 * This allows re-testing without touching the database manually.
 *
 * For each reminder type [gst_1, gst_2, tds_1, tds_2]:
 *   - Builds the target datetime (IST → UTC)
 *   - Skips if in the past
 *   - For each enabled channel [email, whatsapp]:
 *     - Cancels + deletes any existing row (any status)
 *     - Creates a fresh pg-boss job and tracking row
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

    // Determine which channels are enabled
    const enabledChannels = [];
    if (settings.enable_email_reminders) enabledChannels.push('email');
    if (settings.enable_whatsapp_reminders) enabledChannels.push('whatsapp');

    if (enabledChannels.length === 0) {
        logger.info('[reminderScheduler] Both email and WhatsApp are disabled — no jobs scheduled');
        return;
    }

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

        // Human-readable IST display (also reused in success log)
        const istDisplay = new Date(scheduledFor.getTime() + 330 * 60 * 1000)
            .toISOString().replace('T', ' ').slice(0, 19);
        logger.info(`[reminderScheduler] ${type} target: ${istDisplay} IST → UTC: ${scheduledFor.toISOString()}`);

        if (scheduledFor <= now) {
            logger.info(`[reminderScheduler] Skipping ${type} — scheduled time ${scheduledFor.toISOString()} is in the past`);
            continue;
        }

        // Process each enabled channel independently
        for (const channel of enabledChannels) {
            const jobName = CHANNEL_JOB_NAME[channel];

            // ── Always reschedule: cancel + delete any existing row regardless of status ──
            const existingRow = await reminderJobQueries.findJobByTypeAndChannel(settings.id, type, channel);

            if (existingRow) {
                if (existingRow.boss_job_id) {
                    try {
                        await boss.cancel(jobName, existingRow.boss_job_id);
                    } catch (e) {
                        logger.warn(`[reminderScheduler] Could not cancel old boss job ${existingRow.boss_job_id} (${channel}): ${e.message}`);
                    }
                }
                await reminderJobQueries.deleteJobById(existingRow.id);
                logger.info(`[reminderScheduler] Cancelled old ${type} [${channel}] job (status=${existingRow.status}) — rescheduling`);
            }

            // Payload carried by the job
            const payload = {
                settingsId: settings.id,
                reminderType: type,
                channel,
                scheduledFor: scheduledFor.toISOString(),
            };

            // Ensure queue exists before sending
            await boss.createQueue(jobName);

            // Send to pg-boss
            const retryDelay = channel === 'whatsapp' ? 300 : 60; // WA: retry every 5 min; email: 60s
            const bossJobId = await boss.send(jobName, payload, {
                startAfter: scheduledFor,  // must be a Date object
                retryLimit: 5,
                retryDelay,
                retryBackoff: channel === 'email', // exponential for email, fixed for WA
                expireInHours: 24,
            });

            // Track in our own table
            await reminderJobQueries.createJob({
                settings_id: settings.id,
                reminder_type: type,
                scheduled_for: scheduledFor,
                boss_job_id: bossJobId,
                channel,
            });

            if (!bossJobId) {
                logger.error(`[reminderScheduler] pg-boss returned null for ${type} [${channel}] — possible queue issue`);
            } else {
                logger.info(`[reminderScheduler] ✅ Scheduled ${type} [${channel}] | IST: ${istDisplay} | UTC: ${scheduledFor.toISOString()} | bossJobId: ${bossJobId}`);
            }
        }
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

    for (const job of jobs) {
        if (job.boss_job_id && ['pending', 'processing'].includes(job.status)) {
            // Use the correct job name based on channel
            const jobName = CHANNEL_JOB_NAME[job.channel] || EMAIL_JOB_NAME;
            try {
                await boss.cancel(jobName, job.boss_job_id);
            } catch (err) {
                logger.warn(`[reminderScheduler] Could not cancel pg-boss job ${job.boss_job_id}: ${err.message}`);
            }
        }
    }

    const cancelled = await reminderJobQueries.cancelJobsBySettingsId(settingsId);
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

    // For manual triggers, use the email job queue as a generic fallback
    const jobName = reminderType === 'whatsapp' ? WA_JOB_NAME : EMAIL_JOB_NAME;

    // Ensure queue exists before sending
    await boss.createQueue(jobName);

    const jobId = await boss.send(jobName, { reminderType, ...payload, immediate: true }, {
        startAfter: new Date(),
        retryLimit: 3,
        retryDelay: 30,
        retryBackoff: true,
    });
    logger.info(`[reminderScheduler] Triggered immediate job: type=${reminderType}, jobName=${jobName}, bossJobId=${jobId}`);
    return jobId;
}

module.exports = {
    scheduleRemindersFromSettings,
    cancelRemindersForSettings,
    triggerImmediately,
    JOB_NAME,
    EMAIL_JOB_NAME,
    WA_JOB_NAME,
};
