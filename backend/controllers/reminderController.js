const { logger } = require('../utils/logger');
const { triggerImmediately, scheduleRemindersFromSettings } = require('../jobs/reminderScheduler');
const settingsQueries = require('../queries/settingsQueries');

/**
 * Helper: Get the latest settings record ID, creating a minimal default if none exists.
 * @returns {Promise<number>} Settings ID
 */
async function getOrCreateSettingsId() {
    const settings = await settingsQueries.getLatestReminderSettings();
    if (settings) return settings.id;

    logger.info('No settings found — creating default reminder settings record');
    const today = new Date().toISOString().split('T')[0];
    const defaultSettings = await settingsQueries.createReminderSettings({
        current_month: today,
        today_date: today,
        gst_due_date: today,
    });
    return defaultSettings.id;
}

/**
 * @desc    Get current reminder dates
 */
exports.getReminders = async (req, res, next) => {
    try {
        const settings = await settingsQueries.getLatestReminderSettings();

        if (!settings) {
            return res.status(200).json({});
        }

        res.json({
            gst_reminder_1_date: settings.gst_reminder_1_date,
            gst_reminder_2_date: settings.gst_reminder_2_date,
            tds_reminder_1_date: settings.tds_reminder_1_date,
            tds_reminder_2_date: settings.tds_reminder_2_date,
        });
    } catch (error) {
        logger.error('Error fetching reminders:', error);
        next(error);
    }
};

/**
 * @desc    Update reminder dates (partial update)
 */
exports.updateReminders = async (req, res, next) => {
    try {
        const updates = req.body;
        const settingsId = await getOrCreateSettingsId();

        await settingsQueries.updateReminderSettings(settingsId, updates);

        // Reschedule pg-boss jobs with updated dates
        const updatedSettings = await settingsQueries.getReminderSettingsById(settingsId);
        if (updatedSettings) await scheduleRemindersFromSettings(updatedSettings);

        res.json({ success: true, message: 'Reminders updated successfully' });
    } catch (error) {
        if (error.message === 'No valid updates provided') {
            return res.status(400).json({ success: false, message: error.message });
        }
        logger.error('Error updating reminders:', error);
        next(error);
    }
};

/**
 * @desc    Reset all reminder dates
 */
exports.resetReminders = async (req, res, next) => {
    try {
        const settingsId = await getOrCreateSettingsId();
        await settingsQueries.resetReminderDates(settingsId);
        res.json({ success: true, message: 'All reminders reset successfully' });
    } catch (error) {
        logger.error('Error resetting reminders:', error);
        next(error);
    }
};

/**
 * @desc    Manually trigger a specific reminder via pg-boss immediate job
 */
exports.triggerReminder = async (req, res, next) => {
    try {
        const { type } = req.params;
        const validTypes = ['whatsapp', 'email', 'report'];

        if (!validTypes.includes(type)) {
            return res.status(400).json({ success: false, message: 'Invalid reminder type' });
        }

        // Enqueue as immediate pg-boss job (not a direct service call)
        const jobId = await triggerImmediately(type);
        res.json({
            success: true,
            message: `${type} reminder queued for immediate processing`,
            jobId,
        });
    } catch (error) {
        logger.error(`Error triggering ${req.params.type} reminder:`, error);
        next(error);
    }
};