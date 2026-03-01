const db = require('../config/db');

/**
 * Check if a client exists and get client details
 * @param {number} clientId - The client ID
 * @returns {Promise<Object>} - Client details or null if not found
 */
async function getClientForDocument(clientId) {
  const result = await db.query(
    `SELECT id, name, gst_1_enabled, bank_statement_enabled, tds_document_enabled 
     FROM "user".clients WHERE id = $1`,
    [clientId]
  );

  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Check if a document exists for a client and month
 * @param {number} clientId - The client ID
 * @param {string} documentMonth - Month in format "Month YYYY"
 * @returns {Promise<Object>} - Existing document or null if not found
 */
async function getExistingDocument(clientId, documentMonth) {
  const result = await db.query(
    `SELECT id FROM "user".client_documents 
     WHERE client_id = $1 AND document_month = $2`,
    [clientId, documentMonth]
  );

  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Get document by ID
 * @param {number} documentId - The document ID
 * @returns {Promise<Object>} - The document or null if not found
 */
async function getDocumentById(documentId) {
  const result = await db.query(
    `SELECT * FROM "user".client_documents WHERE id = $1`,
    [documentId]
  );

  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Create a new document record
 * @param {Object} params - Document parameters
 * @returns {Promise<Object>} - The created document
 */
async function createDocument(params) {
  const {
    clientId,
    documentMonth,
    gst_1_received = false,
    gst_1_received_date = null,
    bank_statement_received = false,
    bank_statement_received_date = null,
    tds_received = false,
    tds_received_date = null,
    notes = ''
  } = params;

  const result = await db.query(
    `INSERT INTO "user".client_documents 
        (client_id, document_month, 
         gst_1_received, gst_1_received_date,
         bank_statement_received, bank_statement_received_date, 
         tds_received, tds_received_date, 
         notes) 
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
     RETURNING *`,
    [
      clientId,
      documentMonth,
      gst_1_received,
      gst_1_received_date,
      bank_statement_received,
      bank_statement_received_date,
      tds_received,
      tds_received_date,
      notes
    ]
  );

  return result.rows[0];
}

/**
 * Get all clients
 * @returns {Promise<Array>} - Array of clients
 */
async function getAllClientsForDocuments() {
  const result = await db.query(
    `SELECT id, name FROM "user".clients ORDER BY name`
  );

  return result.rows;
}

/**
 * Get count of all clients
 * @returns {Promise<number>} - Count of clients
 */
async function getClientCount() {
  const result = await db.query(`SELECT COUNT(*) FROM "user".clients`);
  return parseInt(result.rows[0].count);
}

/**
 * Get documents for a specific month
 * @param {string} month - Month in format "Month YYYY"
 * @returns {Promise<Array>} - Array of documents
 */
async function getDocumentsByMonth(month) {
  const result = await db.query(
    `SELECT cd.*, c.name, c.email_id_1, c.email_id_2, c.email_id_3, c.gst_filing_type,
            c.gst_1_enabled, c.bank_statement_enabled, c.tds_document_enabled
     FROM "user".client_documents cd
     JOIN "user".clients c ON cd.client_id = c.id
     WHERE cd.document_month = $1
     ORDER BY c.name`,
    [month]
  );

  return result.rows;
}

/**
 * Get count of existing documents for a month
 * @param {string} month - Month in format "Month YYYY"
 * @returns {Promise<number>} - Count of documents
 */
async function getExistingDocumentCount(month) {
  const result = await db.query(
    `SELECT COUNT(DISTINCT client_id) FROM "user".client_documents 
     WHERE document_month = $1`,
    [month]
  );
  return parseInt(result.rows[0].count);
}

/**
 * Get client IDs with existing documents for a month
 * @param {string} month - Month in format "Month YYYY"
 * @returns {Promise<Array>} - Array of client IDs
 */
async function getClientsWithDocuments(month) {
  const result = await db.query(
    `SELECT client_id FROM "user".client_documents 
     WHERE document_month = $1`,
    [month]
  );

  return result.rows.map(row => row.client_id);
}

/**
 * Update a document record
 * @param {number} id - Document ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} - Updated document
 */
async function updateDocument(id, updates) {
  const validFields = [
    'gst_1_received',
    'gst_1_received_date',
    'bank_statement_received',
    'bank_statement_received_date',
    'tds_received',
    'tds_received_date',
    'gst_1_reminder_1_sent',
    'gst_1_reminder_1_sent_date',
    'gst_1_reminder_2_sent',
    'gst_1_reminder_2_sent_date',
    'tds_reminder_1_sent',
    'tds_reminder_1_sent_date',
    'tds_reminder_2_sent',
    'tds_reminder_2_sent_date',
    'bank_reminder_1_sent',
    'bank_reminder_1_sent_date',
    'bank_reminder_2_sent',
    'bank_reminder_2_sent_date',
    'notes'
  ];

  const updateFields = [];
  const values = [];

  let index = 1;
  Object.keys(updates).forEach(key => {
    if (validFields.includes(key)) {
      updateFields.push(`${key} = $${index}`);
      values.push(updates[key]);
      index++;
    }
  });

  if (updateFields.length === 0) {
    throw new Error('No valid updates provided');
  }

  values.push(id); // Add id as the last parameter

  const query = `UPDATE "user".client_documents 
                 SET ${updateFields.join(', ')} 
                 WHERE id = $${index} 
                 RETURNING *`;

  const result = await db.query(query, values);

  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Delete a document
 * @param {number} id - Document ID
 * @returns {Promise<boolean>} - True if document was deleted
 */
async function deleteDocument(id) {
  const result = await db.query(
    `DELETE FROM "user".client_documents WHERE id = $1 RETURNING id`,
    [id]
  );

  return result.rows.length > 0;
}

/**
 * Find duplicate documents for a month
 * @param {string} month - Month in format "Month YYYY"
 * @returns {Promise<Array>} - Array of client IDs with duplicates
 */
async function findDuplicateDocuments(month) {
  const result = await db.query(
    `SELECT client_id, COUNT(*) as count 
     FROM "user".client_documents 
     WHERE document_month = $1 
     GROUP BY client_id 
     HAVING COUNT(*) > 1`,
    [month]
  );

  return result.rows;
}

/**
 * Get all documents for a client for a specific month
 * @param {number} clientId - Client ID
 * @param {string} month - Month in format "Month YYYY"
 * @returns {Promise<Array>} - Array of documents
 */
async function getClientDocumentsForMonth(clientId, month) {
  const result = await db.query(
    `SELECT id, created_at 
     FROM "user".client_documents 
     WHERE client_id = $1 AND document_month = $2
     ORDER BY created_at DESC`,
    [clientId, month]
  );

  return result.rows;
}

/**
 * Delete a document by ID
 * @param {number} id - Document ID
 * @returns {Promise<void>}
 */
async function deleteDocumentById(id) {
  await db.query(
    `DELETE FROM "user".client_documents WHERE id = $1`,
    [id]
  );
}

/**
 * Get all client documents joined with client data (for document listing)
 * @returns {Promise<Array>}
 */
async function getAllDocuments() {
  const result = await db.query(
    `SELECT cd.*, c.name as client_name, c.email_id_1, c.gst_filing_type,
            c.gst_1_enabled, c.bank_statement_enabled, c.tds_document_enabled
     FROM "user".client_documents cd
     JOIN "user".clients c ON cd.client_id = c.id
     ORDER BY cd.document_month DESC, c.name`
  );
  return result.rows;
}

/**
 * Get all document records where at least one required document is still pending
 * @returns {Promise<Array>}
 */
async function getPendingDocuments() {
  const result = await db.query(
    `SELECT cd.*, c.name as client_name, c.email_id_1, c.gst_filing_type,
            c.gst_1_enabled, c.bank_statement_enabled, c.tds_document_enabled
     FROM "user".client_documents cd
     JOIN "user".clients c ON cd.client_id = c.id
     WHERE (c.gst_1_enabled = true AND cd.gst_1_received = false) OR
           (c.bank_statement_enabled = true AND cd.bank_statement_received = false) OR
           (c.tds_document_enabled = true AND cd.tds_received = false)
     ORDER BY cd.document_month DESC, c.name`
  );
  return result.rows;
}

module.exports = {
  getClientForDocument,
  getExistingDocument,
  getDocumentById,
  createDocument,
  getAllClientsForDocuments,
  getClientCount,
  getDocumentsByMonth,
  getExistingDocumentCount,
  getClientsWithDocuments,
  updateDocument,
  deleteDocument,
  findDuplicateDocuments,
  getClientDocumentsForMonth,
  deleteDocumentById,
  getAllDocuments,
  getPendingDocuments,
}; 