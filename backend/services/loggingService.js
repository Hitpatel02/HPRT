const { logger } = require('../utils/logger');
const logsQueries = require('../queries/logsQueries');

/**
 * Service for handling all database logging operations
 */

/**
 * Log a WhatsApp message to the database
 * @param {Object} messageData - Data for the WhatsApp message log
 * @param {string} messageData.client_id - Client ID
 * @param {string} messageData.group_id - WhatsApp group ID
 * @param {string} messageData.message - Message content
 * @param {string} messageData.status - Message status (sent, failed, etc.)
 * @param {string} [messageData.error_message] - Error message if status is failed
 * @returns {Promise<Object>} - The created log entry
 */
async function logWhatsAppMessage(messageData) {
  try {
    const log = await logsQueries.createWhatsAppLog(messageData);
    logger.debug(`WhatsApp message logged to database: ${messageData.message.substring(0, 30)}...`);
    return log;
  } catch (error) {
    logger.error(`Failed to log WhatsApp message to database: ${error.message}`);
    throw error;
  }
}

/**
 * Log an email to the database
 * @param {Object} emailData - Data for the email log
 * @param {string} emailData.client_id - Client ID
 * @param {string} emailData.to_email - Recipient email address
 * @param {string} [emailData.cc_emails] - CC recipients
 * @param {string} [emailData.subject] - Email subject
 * @param {string} [emailData.body] - Email body
 * @param {string} [emailData.template_used] - Email template used
 * @param {string} emailData.status - Email status (sent, failed, etc.)
 * @param {string} [emailData.error_message] - Error message if status is failed
 * @returns {Promise<Object>} - The created log entry
 */
async function logEmail(emailData) {
  try {
    const log = await logsQueries.createEmailLog(emailData);
    logger.debug(`Email logged to database: ${emailData.subject || 'No subject'}`);
    return log;
  } catch (error) {
    logger.error(`Failed to log email to database: ${error.message}`);
    throw error;
  }
}

/**
 * Log a system event to the database
 * @param {Object} systemData - Data for the system log
 * @param {string} systemData.event_type - Type of system event
 * @param {string} systemData.description - Description of the event
 * @param {string} [systemData.user_id] - User ID who triggered the event
 * @param {string} [systemData.ip_address] - IP address of the user
 * @param {string} [systemData.status] - Status of the event
 * @param {Object} [systemData.metadata] - Additional metadata about the event
 * @returns {Promise<Object>} - The created log entry
 */
async function logSystemEvent(systemData) {
  try {
    const log = await logsQueries.createSystemLog(systemData);
    logger.debug(`System event logged to database: ${systemData.event_type}`);
    return log;
  } catch (error) {
    logger.error(`Failed to log system event to database: ${error.message}`);
    throw error;
  }
}

/**
 * Log a document update to the database
 * @param {Object} documentData - Data for the document update log
 * @param {string} documentData.document_id - Document ID
 * @param {string} documentData.document_type - Type of document
 * @param {string} documentData.action - Action performed (create, update, delete)
 * @param {string} [documentData.user_id] - User ID who performed the action
 * @param {string} [documentData.client_id] - Client ID associated with the document
 * @param {Object} [documentData.changes] - Changes made to the document
 * @returns {Promise<Object>} - The created log entry
 */
async function logDocumentUpdate(documentData) {
  try {
    const log = await logsQueries.createDocumentUpdateLog(documentData);
    logger.debug(`Document update logged to database: ${documentData.document_type} - ${documentData.action}`);
    return log;
  } catch (error) {
    logger.error(`Failed to log document update to database: ${error.message}`);
    throw error;
  }
}

module.exports = {
  logWhatsAppMessage,
  logEmail,
  logSystemEvent,
  logDocumentUpdate
}; 