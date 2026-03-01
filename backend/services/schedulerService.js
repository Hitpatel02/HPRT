/**
 * schedulerService.js
 *
 * Phase 2: node-cron has been removed. All scheduling is now handled by pg-boss.
 *
 * This module is a thin shim that:
 *   - Starts pg-boss when the API server boots (getBoss)
 *   - Delegates `reloadScheduler` → reminderScheduler.scheduleRemindersFromSettings
 *   - Delegates `runTaskImmediately` → reminderScheduler.triggerImmediately
 *
 * It preserves the SAME EXPORTS as the old schedulerService so no other files need changing.
 */
const { getBoss } = require('../jobs/boss');
const { scheduleRemindersFromSettings, triggerImmediately } = require('../jobs/reminderScheduler');
const reminderJobQueries = require('../queries/reminderJobQueries');
const settingsQueries = require('../queries/settingsQueries');
const { logger } = require('../utils/logger');

/**
 * Initialize pg-boss and ensure the reminder_jobs tracking table exists.
 * Called once at API server startup.
 *
 * @returns {Promise<{ success: boolean }>}
 */
const initializeScheduledTasks = async () => {
    try {
        // Ensure tracking table exists
        await reminderJobQueries.ensureTable();
        logger.info('✅ reminder_jobs table verified');

        // Start pg-boss (it stores jobs in PostgreSQL — restart-safe)
        await getBoss();
        logger.info('✅ All scheduled tasks initialized (pg-boss)');

        return { success: true };
    } catch (error) {
        logger.error('Error initializing scheduled tasks:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Reload / re-schedule reminders when settings are saved.
 * Replaces the old "stop cron → restart cron" pattern.
 *
 * @param {Object} [settings] - Optional settings object. If omitted, fetches latest from DB.
 * @returns {Promise<{ success: boolean }>}
 */
const reloadScheduler = async (settings) => {
    try {
        const resolvedSettings = settings || (await settingsQueries.getLatestReminderSettings());
        if (resolvedSettings) {
            await scheduleRemindersFromSettings(resolvedSettings);
            logger.info('[scheduler] Reminders rescheduled via pg-boss');
        } else {
            logger.warn('[scheduler] reloadScheduler: no settings available to schedule');
        }
        return { success: true };
    } catch (error) {
        logger.error('Error reloading scheduler:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Enqueue an immediate job via pg-boss for manual triggers.
 * Replaces the old direct service-call pattern.
 *
 * @param {string} taskName - 'email' | 'whatsapp' | 'report'
 */
const runTaskImmediately = async (taskName) => {
    const validTasks = ['email', 'whatsapp', 'report'];
    if (!validTasks.includes(taskName)) {
        throw new Error(`Unknown task: ${taskName}. Valid tasks: ${validTasks.join(', ')}`);
    }
    logger.info(`[scheduler] Triggering immediate '${taskName}' job via pg-boss`);
    await triggerImmediately(taskName);
};

module.exports = { initializeScheduledTasks, runTaskImmediately, reloadScheduler };