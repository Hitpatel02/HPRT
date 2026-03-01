const { logger } = require('../utils/logger');
const documentQueries = require('../queries/documentQueries');

/**
 * @desc    Get all document records with pending status
 */
exports.getPendingDocuments = async (req, res, next) => {
    try {
        const rows = await documentQueries.getPendingDocuments();

        // Annotate each record with its most recent reminder date
        const documentsWithReminders = rows.map(doc => {
            const reminderDates = [
                doc.gst_1_reminder_1_sent_date,
                doc.gst_1_reminder_2_sent_date,
                doc.tds_reminder_1_sent_date,
                doc.tds_reminder_2_sent_date,
                doc.bank_reminder_1_sent_date,
                doc.bank_reminder_2_sent_date,
            ].filter(Boolean);

            reminderDates.sort((a, b) => new Date(b) - new Date(a));

            return {
                ...doc,
                last_reminder_date: reminderDates.length > 0 ? reminderDates[0] : null,
            };
        });

        res.json(documentsWithReminders);
    } catch (error) {
        logger.error('Error fetching pending document records:', error);
        next(error);
    }
};