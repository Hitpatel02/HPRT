const { logger } = require('../utils/logger');
const { Parser } = require('json2csv');
const logsQueries = require('../queries/logsQueries');
const { parseDateRange } = require('../utils/requestUtils');
const { formatDateTime } = require('../utils/dateUtils');

/**
 * @desc    Get WhatsApp logs with date filter
 */
exports.getWhatsAppLogs = async (req, res, next) => {
  try {
    const { startDateTime, endDateTime } = parseDateRange(req.query);
    const logs = await logsQueries.getWhatsAppLogs(startDateTime, endDateTime);
    res.json(logs);
  } catch (error) {
    if (error.statusCode === 400) return res.status(400).json({ success: false, message: error.message });
    logger.error('Error fetching WhatsApp logs:', error);
    next(error);
  }
};

/**
 * @desc    Get email logs with date filter
 */
exports.getEmailLogs = async (req, res, next) => {
  try {
    const { startDateTime, endDateTime } = parseDateRange(req.query);
    const logs = await logsQueries.getEmailLogs(startDateTime, endDateTime);
    res.json(logs);
  } catch (error) {
    if (error.statusCode === 400) return res.status(400).json({ success: false, message: error.message });
    logger.error('Error fetching email logs:', error);
    next(error);
  }
};

/**
 * @desc    Download WhatsApp logs as CSV
 */
exports.downloadWhatsAppLogs = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const { startDateTime, endDateTime } = parseDateRange(req.query);

    const logs = await logsQueries.getWhatsAppLogs(startDateTime, endDateTime);

    const formattedLogs = logs.map((log, index) => ({
      sr_no: index + 1,
      ...log,
      sent_at: log.sent_at ? formatDateTime(log.sent_at) : '',
      created_at: log.created_at ? formatDateTime(log.created_at) : '',
    }));

    const fields = ['sr_no', 'id', 'group_id', 'message', 'status', 'sent_at', 'error_message', 'created_at'];
    const parser = new Parser({ fields });
    const csv = parser.parse(formattedLogs);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=whatsapp_logs_${startDate}_to_${endDate}.csv`);
    res.send(csv);
  } catch (error) {
    if (error.statusCode === 400) return res.status(400).json({ success: false, message: error.message });
    logger.error('Error downloading WhatsApp logs:', error);
    next(error);
  }
};

/**
 * @desc    Download email logs as CSV
 */
exports.downloadEmailLogs = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const { startDateTime, endDateTime } = parseDateRange(req.query);

    const logs = await logsQueries.getEmailLogs(startDateTime, endDateTime);

    const formattedLogs = logs.map((log, index) => ({
      sr_no: index + 1,
      ...log,
      sent_at: log.sent_at ? formatDateTime(log.sent_at) : '',
      created_at: log.created_at ? formatDateTime(log.created_at) : '',
    }));

    const fields = ['sr_no', 'id', 'to_email', 'cc_emails', 'subject', 'template_used', 'status', 'sent_at', 'error_message'];
    const parser = new Parser({ fields });
    const csv = parser.parse(formattedLogs);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=email_logs_${startDate}_to_${endDate}.csv`);
    res.send(csv);
  } catch (error) {
    if (error.statusCode === 400) return res.status(400).json({ success: false, message: error.message });
    logger.error('Error downloading email logs:', error);
    next(error);
  }
};

/**
 * @desc    Get system logs with date filter
 */
exports.getSystemLogs = async (req, res, next) => {
  try {
    const { startDateTime, endDateTime } = parseDateRange(req.query);
    const logs = await logsQueries.getSystemLogs(startDateTime, endDateTime);
    res.json(logs);
  } catch (error) {
    if (error.statusCode === 400) return res.status(400).json({ success: false, message: error.message });
    logger.error('Error fetching system logs:', error);
    next(error);
  }
};

/**
 * @desc    Get document update logs with date filter
 */
exports.getDocumentUpdateLogs = async (req, res, next) => {
  try {
    const { startDateTime, endDateTime } = parseDateRange(req.query);
    const logs = await logsQueries.getDocumentUpdateLogs(startDateTime, endDateTime);
    res.json(logs);
  } catch (error) {
    if (error.statusCode === 400) return res.status(400).json({ success: false, message: error.message });
    logger.error('Error fetching document update logs:', error);
    next(error);
  }
};

/**
 * @desc    Clear WhatsApp logs for a date range
 */
exports.clearWhatsAppLogs = async (req, res, next) => {
  try {
    const { startDateTime, endDateTime } = parseDateRange(req.query);

    const exists = await logsQueries.tableExists('whatsapp_logs');
    if (!exists) {
      return res.status(404).json({ success: false, message: 'WhatsApp logs table does not exist' });
    }

    const count = await logsQueries.deleteWhatsAppLogs(startDateTime, endDateTime);
    res.json({ success: true, message: 'WhatsApp logs cleared successfully', count });
  } catch (error) {
    if (error.statusCode === 400) return res.status(400).json({ success: false, message: error.message });
    logger.error('Error clearing WhatsApp logs:', error);
    next(error);
  }
};

/**
 * @desc    Clear email logs for a date range
 */
exports.clearEmailLogs = async (req, res, next) => {
  try {
    const { startDateTime, endDateTime } = parseDateRange(req.query);

    const exists = await logsQueries.tableExists('email_logs');
    if (!exists) {
      return res.status(404).json({ success: false, message: 'Email logs table does not exist' });
    }

    const count = await logsQueries.deleteEmailLogs(startDateTime, endDateTime);
    res.json({ success: true, message: 'Email logs cleared successfully', count });
  } catch (error) {
    if (error.statusCode === 400) return res.status(400).json({ success: false, message: error.message });
    logger.error('Error clearing email logs:', error);
    next(error);
  }
};