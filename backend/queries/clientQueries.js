const db = require('../config/db');

/**
 * Get all clients
 * @returns {Promise<Array>} - Array of all clients
 */
async function getAllClients() {
  const result = await db.query(`
    SELECT * FROM "user".clients
    ORDER BY name ASC
  `);
  
  return result.rows;
}

/**
 * Get client by ID
 * @param {number} id - Client ID
 * @returns {Promise<Object>} - Client data or null if not found
 */
async function getClientById(id) {
  const result = await db.query(`
    SELECT * FROM "user".clients
    WHERE id = $1
  `, [id]);
  
  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Create a new client
 * @param {Object} clientData - Client data to create
 * @returns {Promise<Object>} - The created client
 */
async function createClient(clientData) {
  const { 
    name, 
    phone_number, 
    email_id_1,
    email_id_2,
    email_id_3, 
    gst_1_enabled, 
    tds_document_enabled, 
    bank_statement_enabled, 
    gst_filing_type, 
    whatsapp_group_id,
    gst_number
  } = clientData;

  const result = await db.query(`
    INSERT INTO "user".clients 
      (name, phone_number, email_id_1, email_id_2, email_id_3, gst_1_enabled, 
       tds_document_enabled, bank_statement_enabled, gst_filing_type, 
       whatsapp_group_id, gst_number)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *
  `, [
    name, 
    phone_number || null, 
    email_id_1 || null,
    email_id_2 || null,
    email_id_3 || null,
    gst_1_enabled !== undefined ? gst_1_enabled : true, 
    tds_document_enabled !== undefined ? tds_document_enabled : false, 
    bank_statement_enabled !== undefined ? bank_statement_enabled : true, 
    gst_filing_type || 'Monthly',
    whatsapp_group_id || null,
    gst_number || null
  ]);
  
  return result.rows[0];
}

/**
 * Update client details
 * @param {number} id - Client ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} - Updated client or null if not found
 */
async function updateClient(id, updates) {
  // Define valid fields for update
  const validFields = [
    'name', 
    'phone_number', 
    'email_id_1',
    'email_id_2',
    'email_id_3', 
    'gst_1_enabled', 
    'tds_document_enabled', 
    'bank_statement_enabled', 
    'gst_filing_type',
    'whatsapp_group_id',
    'gst_number'
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
  
  // Update the client
  const query = `
    UPDATE "user".clients 
    SET ${updateFields.join(', ')} 
    WHERE id = $${index} 
    RETURNING *
  `;
  
  const result = await db.query(query, values);
  
  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Check if client exists
 * @param {number} id - Client ID
 * @returns {Promise<boolean>} - True if client exists
 */
async function clientExists(id) {
  const result = await db.query(`
    SELECT id FROM "user".clients WHERE id = $1
  `, [id]);
  
  return result.rows.length > 0;
}

/**
 * Delete a client and related documents
 * @param {number} id - Client ID
 * @returns {Promise<boolean>} - True if deleted
 */
async function deleteClient(id) {
  try {
    // Begin transaction
    await db.query('BEGIN');
    
    // Delete client documents
    await db.query(`DELETE FROM "user".client_documents WHERE client_id = $1`, [id]);
    
    // Delete client
    await db.query(`DELETE FROM "user".clients WHERE id = $1`, [id]);
    
    // Commit transaction
    await db.query('COMMIT');
    
    return true;
  } catch (error) {
    // Rollback on error
    await db.query('ROLLBACK');
    throw error;
  }
}

/**
 * Get documents for a specific client
 * @param {number} clientId - Client ID
 * @returns {Promise<Array>} - Array of client documents
 */
async function getClientDocuments(clientId) {
  const result = await db.query(`
    SELECT * FROM "user".client_documents
    WHERE client_id = $1
    ORDER BY document_month DESC
  `, [clientId]);
  
  return result.rows;
}

module.exports = {
  getAllClients,
  getClientById,
  createClient,
  updateClient,
  clientExists,
  deleteClient,
  getClientDocuments
}; 