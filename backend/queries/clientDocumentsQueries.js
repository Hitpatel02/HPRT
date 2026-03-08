const db = require('../config/db');

/**
 * Update the reminder status for a client document
 * @param {Object} reminderData - Reminder data
 * @param {number} reminderData.client_id - Client ID
 * @param {string} reminderData.document_month - Document month
 * @param {number} reminderData.reminder_number - Reminder number (1 or 2)
 * @param {string} reminderData.document_type - Document type (gst, tds, bank)
 * @param {string} reminderData.column_prefix - Column prefix in database
 * @returns {Promise<Object>} - Updated document record
 */
async function updateReminderStatus(reminderData) {
  const {
    client_id,
    document_month,
    reminder_number,
    column_prefix
  } = reminderData;

  // Map every valid prefix+number combination to hardcoded column names.
  // This prevents column-name injection — no string from outside this map
  // can ever reach the SQL statement.
  const COLUMN_MAP = {
    'gst_1_reminder_1': { sent: 'gst_1_reminder_1_sent', date: 'gst_1_reminder_1_sent_date' },
    'gst_1_reminder_2': { sent: 'gst_1_reminder_2_sent', date: 'gst_1_reminder_2_sent_date' },
    'tds_reminder_1': { sent: 'tds_reminder_1_sent', date: 'tds_reminder_1_sent_date' },
    'tds_reminder_2': { sent: 'tds_reminder_2_sent', date: 'tds_reminder_2_sent_date' },
    'bank_reminder_1': { sent: 'bank_reminder_1_sent', date: 'bank_reminder_1_sent_date' },
    'bank_reminder_2': { sent: 'bank_reminder_2_sent', date: 'bank_reminder_2_sent_date' },
  };

  // column_prefix already ends with '_', e.g. 'gst_1_reminder_' → strip trailing '_'
  const key = `${column_prefix.replace(/_$/, '')}${reminder_number}`;
  const cols = COLUMN_MAP[key];
  if (!cols) {
    throw new Error(`[clientDocumentsQueries] Invalid reminder column key: ${key}`);
  }

  const result = await db.query(
    `UPDATE "user".client_documents 
     SET ${cols.sent} = TRUE, 
         ${cols.date} = CURRENT_TIMESTAMP 
     WHERE client_id = $1 AND document_month = $2
     RETURNING *`,
    [client_id, document_month]
  );

  return result.rows[0];
}

/**
 * Get client documents for a specific client and month
 * @param {number} clientId - Client ID
 * @param {string} documentMonth - Document month (e.g. "January 2024")
 * @returns {Promise<Object|null>} - Client document record or null if not found
 */
async function getClientDocument(clientId, documentMonth) {
  const result = await db.query(
    `SELECT * FROM "user".client_documents
     WHERE client_id = $1 AND document_month = $2`,
    [clientId, documentMonth]
  );

  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Create a new client document record
 * @param {Object} documentData - Document data
 * @returns {Promise<Object>} - Created document record
 */
async function createClientDocument(documentData) {
  const {
    client_id,
    document_month,
    gst_1_received = false,
    bank_statement_received = false,
    tds_received = false
  } = documentData;

  const result = await db.query(
    `INSERT INTO "user".client_documents
       (client_id, document_month, gst_1_received, bank_statement_received, tds_received)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [client_id, document_month, gst_1_received, bank_statement_received, tds_received]
  );

  return result.rows[0];
}

/**
 * Update document receipt status
 * @param {Object} updateData - Update data
 * @param {number} updateData.client_id - Client ID
 * @param {string} updateData.document_month - Document month
 * @param {string} updateData.document_type - Document type (gst_1, bank_statement, tds)
 * @param {boolean} updateData.received - Whether document was received
 * @returns {Promise<Object>} - Updated document record
 */
async function updateDocumentReceived(updateData) {
  const {
    client_id,
    document_month,
    document_type,
    received
  } = updateData;

  // Map document type to column name
  let columnName;
  switch (document_type) {
    case 'gst':
    case 'gst_1':
      columnName = 'gst_1_received';
      break;
    case 'bank':
    case 'bank_statement':
      columnName = 'bank_statement_received';
      break;
    case 'tds':
      columnName = 'tds_received';
      break;
    default:
      throw new Error(`Invalid document type: ${document_type}`);
  }

  const result = await db.query(
    `UPDATE "user".client_documents
     SET ${columnName} = $1,
         ${columnName}_date = CURRENT_TIMESTAMP
     WHERE client_id = $2 AND document_month = $3
     RETURNING *`,
    [received, client_id, document_month]
  );

  return result.rows[0];
}

module.exports = {
  updateReminderStatus,
  getClientDocument,
  createClientDocument,
  updateDocumentReceived
}; 