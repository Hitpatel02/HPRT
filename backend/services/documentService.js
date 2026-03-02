const clientQueries = require('../queries/clientQueries');
const { logger } = require('../utils/logger');
const documentQueries = require('../queries/documentQueries');
const { getFormattedMonth } = require('../utils/dateUtils');

/**
 * Create a document record for a client for the current month
 * @param {number} clientId - The client ID
 * @param {string} documentMonth - Optional month in format "Month YYYY" (e.g., "January 2023")
 * @returns {Promise<Object>} - The created document record
 */

async function createDocumentForClient(clientId, documentMonth = null) {
  try {
    // Check if client exists and get document type preferences
    const client = await clientQueries.getClientById(clientId);

    if (!client) {
      throw new Error(`Client with ID ${clientId} not found`);
    }

    // Get current month if not provided
    const month = documentMonth || getFormattedMonth();

    // Check if document record already exists for this client and month
    const existingDoc = await documentQueries.getExistingDocument(clientId, month);

    if (existingDoc) {
      logger.info(`Document for client ${client.name} (ID: ${clientId}) and month ${month} already exists (ID: ${existingDoc.id})`);
      return existingDoc;
    }

    // Create document record with all fields initialized to false/null
    const document = await documentQueries.createDocument({
      clientId,
      documentMonth: month,
      // Default values are set in the query function
    });

    logger.info(`Created document for client ${client.name} (ID: ${clientId}) for month ${month}`);
    return document;
  } catch (error) {
    logger.error('Error creating document for client:', error);
    throw error;
  }
}

/**
 * Create document records for all clients for the current month
 * @param {string} documentMonth - Optional month in format "Month YYYY" (e.g., "January 2023")
 * @returns {Promise<Array>} - Array of created document records
 */
async function createDocumentsForAllClients(documentMonth = null) {
  try {
    // Get current month if not provided
    const month = documentMonth || getFormattedMonth();

    // Get all active clients
    const clients = await documentQueries.getAllClientsForDocuments();

    // Check which clients already have documents for this month
    const existingClientIds = await documentQueries.getClientsWithDocuments(month);
    const existingClientIdSet = new Set(existingClientIds);

    const results = [];
    // Only create documents for clients who don't already have them
    for (const client of clients) {
      if (!existingClientIdSet.has(client.id)) {
        try {
          const document = await createDocumentForClient(client.id, month);
          results.push(document);
        } catch (error) {
          logger.error(`Error creating document for client ${client.name} (ID: ${client.id}):`, error);
          // Continue with other clients even if one fails
          continue;
        }
      }
    }

    return results;
  } catch (error) {
    logger.error('Error creating documents for all clients:', error);
    throw error;
  }
}

module.exports = {
  createDocumentForClient,
  createDocumentsForAllClients
}; 
