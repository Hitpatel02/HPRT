const db = require('../config/db');

/**
 * Check if a table exists in the database
 * @param {string} tableName - Name of the table to check
 * @returns {Promise<boolean>} - Whether the table exists
 */
async function tableExists(tableName) {
  const result = await db.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'user' 
      AND table_name = $1
    );
  `, [tableName]);
  
  return result.rows[0].exists;
}

/**
 * Get WhatsApp logs within a date range
 * @param {Date} startDateTime - Start date/time
 * @param {Date} endDateTime - End date/time 
 * @returns {Promise<Array>} - Array of WhatsApp logs
 */
async function getWhatsAppLogs(startDateTime, endDateTime) {
  // Check if table exists first
  const exists = await tableExists('whatsapp_logs');
  if (!exists) {
    return [];
  }
  
  const result = await db.query(`
    SELECT wl.*, c.name as client_name 
    FROM "user".whatsapp_logs wl
    LEFT JOIN "user".clients c ON wl.client_id = c.id
    WHERE wl.sent_at BETWEEN $1 AND $2 OR wl.created_at BETWEEN $1 AND $2
    ORDER BY wl.sent_at DESC, wl.created_at DESC
  `, [startDateTime.toISOString(), endDateTime.toISOString()]);
  
  return result.rows;
}

/**
 * Get email logs within a date range
 * @param {Date} startDateTime - Start date/time
 * @param {Date} endDateTime - End date/time
 * @returns {Promise<Array>} - Array of email logs
 */
async function getEmailLogs(startDateTime, endDateTime) {
  // Check if table exists first
  const exists = await tableExists('email_logs');
  if (!exists) {
    return [];
  }
  
  const result = await db.query(`
    SELECT el.*, c.name as client_name
    FROM "user".email_logs el
    LEFT JOIN "user".clients c ON el.client_id = c.id
    WHERE el.sent_at BETWEEN $1 AND $2
    ORDER BY el.sent_at DESC
  `, [startDateTime.toISOString(), endDateTime.toISOString()]);
  
  return result.rows;
}

/**
 * Get system logs within a date range
 * @param {Date} startDateTime - Start date/time
 * @param {Date} endDateTime - End date/time
 * @returns {Promise<Array>} - Array of system logs
 */
async function getSystemLogs(startDateTime, endDateTime) {
  // Check if table exists first
  const exists = await tableExists('system_logs');
  if (!exists) {
    return [];
  }
  
  const result = await db.query(`
    SELECT * FROM "user".system_logs
    WHERE timestamp BETWEEN $1 AND $2
    ORDER BY timestamp DESC
  `, [startDateTime.toISOString(), endDateTime.toISOString()]);
  
  return result.rows;
}

/**
 * Get document update logs within a date range
 * @param {Date} startDateTime - Start date/time
 * @param {Date} endDateTime - End date/time
 * @returns {Promise<Array>} - Array of document update logs
 */
async function getDocumentUpdateLogs(startDateTime, endDateTime) {
  // Check if table exists first
  const exists = await tableExists('document_update_logs');
  if (!exists) {
    return [];
  }
  
  const result = await db.query(`
    SELECT l.*, c.name as client_name
    FROM "user".document_update_logs l
    LEFT JOIN "user".clients c ON l.client_id = c.id
    WHERE l.timestamp BETWEEN $1 AND $2
    ORDER BY l.timestamp DESC
  `, [startDateTime.toISOString(), endDateTime.toISOString()]);
  
  return result.rows;
}

/**
 * Create a new log entry for WhatsApp
 * @param {Object} logData - Log data to insert
 * @returns {Promise<Object>} - The created log entry
 */
async function createWhatsAppLog(logData) {
  const {
    client_id,
    group_id, 
    message, 
    status, 
    error_message
  } = logData;
  
  const result = await db.query(`
    INSERT INTO "user".whatsapp_logs 
      (client_id, group_id, message, status, error_message, sent_at)
    VALUES ($1, $2, $3, $4, $5, NOW())
    RETURNING *
  `, [client_id || null, group_id, message, status, error_message]);
  
  return result.rows[0];
}

/**
 * Create a new log entry for email
 * @param {Object} logData - Log data to insert
 * @returns {Promise<Object>} - The created log entry
 */
async function createEmailLog(logData) {
  const {
    client_id,
    to_email,
    subject,
    body,
    status,
    error_message,
    document_month,
    reminder_number
  } = logData;
  
  const result = await db.query(`
    INSERT INTO "user".email_logs 
      (client_id, email_to, email_subject, email_body, sent_at, status, error_message, document_month, reminder_number)
    VALUES ($1, $2, $3, $4, NOW(), $5, $6, $7, $8)
    RETURNING *
  `, [
    client_id || null, 
    to_email, 
    subject, 
    body || null, 
    status, 
    error_message || null, 
    document_month || null, 
    reminder_number || null
  ]);
  
  return result.rows[0];
}

/**
 * Create a system log entry
 * @param {Object} logData - Log data to insert
 * @returns {Promise<Object>} - The created log entry
 */
async function createSystemLog(logData) {
  const {
    event_type,
    user_id,
    message,
    details
  } = logData;
  
  const result = await db.query(`
    INSERT INTO "user".system_logs 
      (event_type, user_id, message, details, timestamp)
    VALUES ($1, $2, $3, $4, NOW())
    RETURNING *
  `, [event_type, user_id || null, message, details]);
  
  return result.rows[0];
}

/**
 * Create a document update log entry
 * @param {Object} logData - Log data to insert
 * @returns {Promise<Object>} - The created log entry
 */
async function createDocumentUpdateLog(logData) {
  const {
    client_id,
    document_id,
    document_type,
    update_type,
    user_id,
    details
  } = logData;
  
  const result = await db.query(`
    INSERT INTO "user".document_update_logs 
      (client_id, document_id, document_type, update_type, user_id, details, timestamp)
    VALUES ($1, $2, $3, $4, $5, $6, NOW())
    RETURNING *
  `, [client_id, document_id, document_type, update_type, user_id || null, details]);
  
  return result.rows[0];
}

/**
 * Delete WhatsApp logs within a date range
 * @param {Date} startDateTime - Start date/time
 * @param {Date} endDateTime - End date/time
 * @returns {Promise<number>} - Number of deleted rows
 */
async function deleteWhatsAppLogs(startDateTime, endDateTime) {
  const result = await db.query(`
    DELETE FROM "user".whatsapp_logs
    WHERE (sent_at BETWEEN $1 AND $2) OR (created_at BETWEEN $1 AND $2)
    RETURNING id
  `, [startDateTime.toISOString(), endDateTime.toISOString()]);
  
  return result.rowCount;
}

/**
 * Delete email logs within a date range
 * @param {Date} startDateTime - Start date/time
 * @param {Date} endDateTime - End date/time
 * @returns {Promise<number>} - Number of deleted rows
 */
async function deleteEmailLogs(startDateTime, endDateTime) {
  const result = await db.query(`
    DELETE FROM "user".email_logs
    WHERE sent_at BETWEEN $1 AND $2
    RETURNING id
  `, [startDateTime.toISOString(), endDateTime.toISOString()]);
  
  return result.rowCount;
}

module.exports = {
  getWhatsAppLogs,
  getEmailLogs,
  getSystemLogs,
  getDocumentUpdateLogs,
  createWhatsAppLog,
  createEmailLog,
  createSystemLog,
  createDocumentUpdateLog,
  deleteWhatsAppLogs,
  deleteEmailLogs,
  tableExists
}; 