const { logger } = require('../utils/logger');
const { scheduleRemindersFromSettings, cancelRemindersForSettings } = require('../jobs/reminderScheduler');
const settingsQueries = require('../queries/settingsQueries');
const { MONTHS } = require('../utils/dateUtils');

/**
 * @desc    Get current reminder settings
 */
exports.getReminderSettings = async (req, res, next) => {
    try {
        const settings = await settingsQueries.getLatestReminderSettings();

        if (!settings) {
            return res.status(200).json({});
        }

        res.json(settings);
    } catch (error) {
        logger.error('Error fetching reminder settings:', error);
        next(error);
    }
};

/**
 * @desc    Get all available months with reminder settings
 */
exports.getAvailableMonths = async (req, res, next) => {
    try {
        const result = await settingsQueries.getAvailableMonths();

        const months = result.map(row => ({
            ...row,
            month_name: MONTHS[row.month - 1],
            formatted: `${MONTHS[row.month - 1]} ${row.year}`,
        }));

        res.json(months);
    } catch (error) {
        logger.error('Error fetching available months:', error);
        next(error);
    }
};

/**
 * @desc    Get settings for a specific month and year
 */
exports.getSettingsForMonth = async (req, res, next) => {
    try {
        const { year, month } = req.params;

        if (!month || !year || isNaN(month) || isNaN(year)) {
            return res.status(400).json({ success: false, message: 'Valid month and year are required' });
        }

        const monthIndex = parseInt(month) - 1;
        if (monthIndex < 0 || monthIndex >= 12) {
            return res.status(400).json({ success: false, message: 'Month must be between 1 and 12' });
        }

        const monthName = MONTHS[monthIndex];
        const monthYearString = `${monthName} ${year}`;
        const settings = await settingsQueries.getSettingsForMonth(monthYearString);

        if (!settings) {
            const defaultSettings = await settingsQueries.getLatestReminderSettings();

            if (!defaultSettings) {
                return res.status(200).json({});
            }

            return res.json({
                ...defaultSettings,
                id: null,
                today_date: null,
                gst_due_date: null,
                gst_reminder_1_date: null,
                gst_reminder_2_date: null,
                tds_due_date: null,
                tds_reminder_1_date: null,
                tds_reminder_2_date: null,
                current_month: monthYearString,
                isNewRecord: true,
            });
        }

        res.json({ ...settings, isNewRecord: false });
    } catch (error) {
        logger.error('Error fetching settings for month:', error);
        next(error);
    }
};

/**
 * @desc    Create new reminder settings
 */
exports.createReminderSettings = async (req, res, next) => {
    try {
        const {
            current_month, today_date, gst_due_date,
            gst_reminder_1_date, gst_reminder_2_date,
            tds_due_date, tds_reminder_1_date, tds_reminder_2_date,
            password, scheduler_hour, scheduler_minute, scheduler_am_pm,
            enable_whatsapp_reminders, enable_email_reminders,
        } = req.body;

        if (!current_month || !today_date || !gst_due_date) {
            return res.status(400).json({
                success: false,
                message: 'Current month, today date, and GST due date are required',
            });
        }

        if (scheduler_minute !== undefined && (scheduler_minute < 0 || scheduler_minute > 59)) {
            return res.status(400).json({ success: false, message: 'Scheduler minute must be between 0 and 59' });
        }

        const result = await settingsQueries.createReminderSettings({
            current_month, today_date, gst_due_date,
            gst_reminder_1_date, gst_reminder_2_date,
            tds_due_date, tds_reminder_1_date, tds_reminder_2_date,
            password, scheduler_hour, scheduler_minute, scheduler_am_pm,
            enable_whatsapp_reminders, enable_email_reminders,
        });

        // Schedule reminder jobs via pg-boss for the saved dates
        const fullSettings = await settingsQueries.getReminderSettingsById(result.id);
        if (fullSettings) await scheduleRemindersFromSettings(fullSettings);

        res.status(201).json({ success: true, message: 'Reminder settings created successfully', settings: result });
    } catch (error) {
        logger.error('Error creating reminder settings:', error);
        next(error);
    }
};

/**
 * @desc    Save settings for specific month (create or update)
 */
exports.saveSettingsForMonth = async (req, res, next) => {
    try {
        const { year, month } = req.params;
        const settings = req.body;

        if (!month || !year || isNaN(month) || isNaN(year)) {
            return res.status(400).json({ success: false, message: 'Valid month and year are required' });
        }

        const monthIndex = parseInt(month) - 1;
        if (monthIndex < 0 || monthIndex >= 12) {
            return res.status(400).json({ success: false, message: 'Month must be between 1 and 12' });
        }

        const monthName = MONTHS[monthIndex];
        const monthYearString = `${monthName} ${parseInt(year)}`;
        settings.current_month = monthYearString;

        delete settings.month;
        delete settings.year;

        // Always use today as today_date
        const today = new Date();
        settings.today_date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

        const existing = await settingsQueries.getSettingsForMonth(monthYearString);

        let result;
        if (existing === null) {
            if (!settings.today_date || !settings.gst_due_date) {
                return res.status(400).json({ success: false, message: 'today_date and gst_due_date are required' });
            }
            result = await settingsQueries.createReminderSettings(settings);
            const fullSettings = await settingsQueries.getReminderSettingsById(result.id);
            if (fullSettings) await scheduleRemindersFromSettings(fullSettings);
            return res.status(201).json({
                success: true,
                message: `Reminder settings for ${monthYearString} created successfully`,
                settings: result,
            });
        }

        result = await settingsQueries.updateReminderSettings(existing.id, settings);
        await scheduleRemindersFromSettings(result);
        res.json({
            success: true,
            message: `Reminder settings for ${monthYearString} updated successfully`,
            settings: result,
        });
    } catch (error) {
        logger.error('Error saving settings for month:', error);
        next(error);
    }
};

/**
 * @desc    Update reminder settings by ID
 */
exports.updateReminderSettings = async (req, res, next) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        if (!id || isNaN(id)) {
            return res.status(400).json({ success: false, message: 'Valid ID is required' });
        }

        if (updates.current_month === '' || updates.today_date === '' || updates.gst_due_date === '') {
            return res.status(400).json({
                success: false,
                message: 'Current month, today date, and GST due date cannot be empty if provided',
            });
        }

        if (updates.scheduler_minute !== undefined && (updates.scheduler_minute < 0 || updates.scheduler_minute > 59)) {
            return res.status(400).json({ success: false, message: 'Scheduler minute must be between 0 and 59' });
        }

        const existing = await settingsQueries.getReminderSettingsById(id);
        if (!existing) {
            return res.status(404).json({ success: false, message: 'Settings not found' });
        }

        const result = await settingsQueries.updateReminderSettings(id, updates);

        // If any date or scheduler field changed, reschedule pg-boss jobs
        const hasSchedulerChange = updates.scheduler_hour !== undefined ||
            updates.scheduler_minute !== undefined ||
            updates.scheduler_am_pm !== undefined ||
            updates.gst_reminder_1_date !== undefined ||
            updates.gst_reminder_2_date !== undefined ||
            updates.tds_reminder_1_date !== undefined ||
            updates.tds_reminder_2_date !== undefined;

        if (hasSchedulerChange) {
            await scheduleRemindersFromSettings(result);
        }

        res.json({ success: true, message: 'Settings updated successfully', settings: result });
    } catch (error) {
        logger.error('Error updating reminder settings:', error);
        next(error);
    }
};

/**
 * @desc    Delete reminder settings
 */
exports.deleteReminderSettings = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (!id || isNaN(id)) {
            return res.status(400).json({ success: false, message: 'Valid ID is required' });
        }

        const existing = await settingsQueries.getReminderSettingsById(id);
        if (!existing) {
            return res.status(404).json({ success: false, message: 'Settings not found' });
        }

        await settingsQueries.deleteReminderSettings(id);
        await cancelRemindersForSettings(parseInt(id));
        res.json({ success: true, message: 'Reminder settings deleted successfully' });
    } catch (error) {
        logger.error('Error deleting reminder settings:', error);
        next(error);
    }
};

/**
 * @desc    Update notification settings (WhatsApp / email toggles)
 */
exports.updateNotificationSettings = async (req, res, next) => {
    try {
        const { enable_whatsapp_reminders, enable_email_reminders } = req.body;

        if (enable_whatsapp_reminders === undefined && enable_email_reminders === undefined) {
            return res.status(400).json({
                success: false,
                message: 'At least one notification toggle must be provided',
            });
        }

        const settings = await settingsQueries.getLatestReminderSettings();

        if (!settings) {
            logger.info('No settings found — creating default settings before updating notification toggles');
            const today = new Date().toISOString().split('T')[0];
            await settingsQueries.createReminderSettings({
                current_month: today,
                today_date: today,
                gst_due_date: today,
                enable_whatsapp_reminders: enable_whatsapp_reminders !== undefined ? enable_whatsapp_reminders : true,
                enable_email_reminders: enable_email_reminders !== undefined ? enable_email_reminders : true,
            });
        } else {
            const updates = {};
            if (enable_whatsapp_reminders !== undefined) updates.enable_whatsapp_reminders = enable_whatsapp_reminders;
            if (enable_email_reminders !== undefined) updates.enable_email_reminders = enable_email_reminders;
            await settingsQueries.updateReminderSettings(settings.id, updates);
        }

        res.json({ success: true, message: 'Notification settings updated successfully' });
    } catch (error) {
        logger.error('Error updating notification settings:', error);
        next(error);
    }
};

/**
 * @desc    Reload the scheduler (reschedule from latest settings)
 */
exports.reloadSchedulerSettings = async (req, res, next) => {
    try {
        const settings = await settingsQueries.getLatestReminderSettings();
        if (settings) {
            await scheduleRemindersFromSettings(settings);
        }
        res.json({ success: true, message: 'Scheduler reloaded successfully — reminder jobs rescheduled via pg-boss' });
    } catch (error) {
        logger.error('Error reloading scheduler:', error);
        next(error);
    }
};