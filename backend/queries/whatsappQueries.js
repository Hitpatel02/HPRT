const db = require('../config/db');

/**
 * Get client by WhatsApp group ID
 * @param {string} groupId - WhatsApp group ID
 * @returns {Promise<Object>} - Client data or null if not found
 */
async function getClientByGroupId(groupId) {
  const result = await db.query(
    `SELECT c.*, 
            CASE WHEN cg.group_id IS NOT NULL THEN true ELSE false END as has_group
     FROM "user".clients c
     LEFT JOIN "user".client_groups cg ON c.id = cg.client_id
     WHERE cg.group_id = $1`,
    [groupId]
  );
  
  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Save a new WhatsApp group to client association
 * @param {number} clientId - Client ID
 * @param {string} groupId - WhatsApp group ID
 * @param {string} groupName - WhatsApp group name
 * @returns {Promise<Object>} - The created association
 */
async function saveClientGroup(clientId, groupId, groupName = '') {
  // Check if group already exists
  const existingGroup = await db.query(
    `SELECT * FROM "user".client_groups WHERE group_id = $1`,
    [groupId]
  );
  
  if (existingGroup.rows.length > 0) {
    // Update existing group
    const result = await db.query(
      `UPDATE "user".client_groups 
       SET client_id = $1, group_name = $2, updated_at = NOW() 
       WHERE group_id = $3
       RETURNING *`,
      [clientId, groupName, groupId]
    );
    
    return result.rows[0];
  } else {
    // Create new group
    const result = await db.query(
      `INSERT INTO "user".client_groups (client_id, group_id, group_name)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [clientId, groupId, groupName]
    );
    
    return result.rows[0];
  }
}

/**
 * Get all WhatsApp groups for a client
 * @param {number} clientId - Client ID
 * @returns {Promise<Array>} - Array of WhatsApp groups
 */
async function getClientGroups(clientId) {
  const result = await db.query(
    `SELECT * FROM "user".client_groups WHERE client_id = $1`,
    [clientId]
  );
  
  return result.rows;
}

/**
 * Get all clients with associated WhatsApp groups
 * @returns {Promise<Array>} - Array of clients with groups
 */
async function getClientsWithGroups() {
  const result = await db.query(
    `SELECT c.id, c.name, c.email_id_1, cg.group_id, cg.group_name
     FROM "user".clients c
     JOIN "user".client_groups cg ON c.id = cg.client_id
     ORDER BY c.name`
  );
  
  return result.rows;
}

/**
 * Delete a WhatsApp group association
 * @param {number} clientId - Client ID
 * @param {string} groupId - WhatsApp group ID
 * @returns {Promise<boolean>} - True if deleted
 */
async function deleteClientGroup(clientId, groupId) {
  const result = await db.query(
    `DELETE FROM "user".client_groups 
     WHERE client_id = $1 AND group_id = $2
     RETURNING id`,
    [clientId, groupId]
  );
  
  return result.rows.length > 0;
}

module.exports = {
  getClientByGroupId,
  saveClientGroup,
  getClientGroups,
  getClientsWithGroups,
  deleteClientGroup
}; 