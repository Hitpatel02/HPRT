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

        // Log IST time for human-readable audit alongside UTC
        // istDisplay is also reused in the final ✅ success log below
        const istDisplay = new Date(scheduledFor.getTime() + 330 * 60 * 1000)
            .toISOString().replace('T', ' ').slice(0, 19);
        logger.info(`[reminderScheduler] ${type} target: ${istDisplay} IST → UTC: ${scheduledFor.toISOString()}`);

        if (scheduledFor <= now) {
            logger.info(`[reminderScheduler] Skipping ${type} — scheduled time ${scheduledFor.toISOString()} is in the past`);
            continue;
        }

        // Idempotency: if a job exists for this settings+type, handle it based on status.
        // • 'sent'            → already delivered successfully, skip entirely
        // • 'pending'/'failed' → stale (possibly wrong date from old bug), cancel + delete so we re-schedule fresh
        const existingJobs = await reminderJobQueries.getJobsBySettingsId(settings.id);
        const existingJob = existingJobs.find(j => j.reminder_type === type);

        if (existingJob) {
            if (existingJob.status === 'sent') {
                logger.info(`[reminderScheduler] Skipping ${type} — already sent successfully`);
                continue;
            }
            // Cancel the old pg-boss job if it has one
            if (existingJob.boss_job_id) {
                try {
                    await boss.cancel(JOB_NAME, existingJob.boss_job_id);
                } catch (e) {
                    logger.warn(`[reminderScheduler] Could not cancel old boss job ${existingJob.boss_job_id}: ${e.message}`);
                }
            }
            // Remove stale tracking row so we can insert a fresh one
            await reminderJobQueries.deleteJobById(existingJob.id);
            logger.info(`[reminderScheduler] Cancelled stale ${type} job (status=${existingJob.status}) — rescheduling fresh`);
        }

        // Payload carried by the job — the worker uses this to fetch and send
        const payload = {
            settingsId: settings.id,
            reminderType: type,
            scheduledFor: scheduledFor.toISOString(),
        };

        // Ensure queue exists before sending
        await boss.createQueue(JOB_NAME);

        // Send to pg-boss. scheduledFor is always a Date object (required by pg-boss).
        const bossJobId = await boss.send(JOB_NAME, payload, {
            startAfter: scheduledFor,  // must be a Date object
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

        // istDisplay was already computed above for the audit log — reuse it here
        if (!bossJobId) {
            logger.error(`[reminderScheduler] pg-boss returned null for ${type} — job may already exist with same key or queue issue`);
        } else {
            logger.info(`[reminderScheduler] ✅ Scheduled ${type} | IST: ${istDisplay} | UTC: ${scheduledFor.toISOString()} | bossJobId: ${bossJobId}`);
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

    // Ensure queue exists before sending
    await boss.createQueue(JOB_NAME);

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
