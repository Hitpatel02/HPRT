const db = require('../config/db');

/**
 * Get report data with date filtering
 * @param {string} startDate - Optional start date for filtering (YYYY-MM-DD)
 * @param {string} endDate - Optional end date for filtering (YYYY-MM-DD)
 * @returns {Promise<Array>} - Array of document records
 */
async function getReportData() {
  try {
    // Get all documents with client details
    const query = `
      SELECT cd.*, 
             c.name as client_name, 
             c.gst_filing_type,
             c.gst_1_enabled, 
             c.bank_statement_enabled, 
             c.tds_document_enabled,
             c.gst_number
      FROM "user".client_documents cd
      JOIN "user".clients c ON cd.client_id = c.id
      ORDER BY cd.document_month DESC, c.name
    `;
    
    const { rows: allDocuments } = await db.query(query);
    return allDocuments;
  } catch (error) {
    console.error("Error fetching raw report data:", error);
    throw error;
  }
}

/**
 * Get document status counts by month
 * @returns {Promise<Array>} - Array of counts by month
 */
async function getDocumentStatusByMonth() {
  try {
    const query = `
      SELECT 
        cd.document_month,
        COUNT(*) as total_clients,
        SUM(CASE WHEN c.gst_1_enabled AND cd.gst_1_received THEN 1 ELSE 0 END) as gst_received,
        SUM(CASE WHEN c.gst_1_enabled AND NOT cd.gst_1_received THEN 1 ELSE 0 END) as gst_pending,
        SUM(CASE WHEN c.bank_statement_enabled AND cd.bank_statement_received THEN 1 ELSE 0 END) as bank_received,
        SUM(CASE WHEN c.bank_statement_enabled AND NOT cd.bank_statement_received THEN 1 ELSE 0 END) as bank_pending,
        SUM(CASE WHEN c.tds_document_enabled AND cd.tds_received THEN 1 ELSE 0 END) as tds_received,
        SUM(CASE WHEN c.tds_document_enabled AND NOT cd.tds_received THEN 1 ELSE 0 END) as tds_pending
      FROM "user".client_documents cd
      JOIN "user".clients c ON cd.client_id = c.id
      GROUP BY cd.document_month
      ORDER BY 
        CASE 
          WHEN cd.document_month ~ '^January' THEN 1
          WHEN cd.document_month ~ '^February' THEN 2
          WHEN cd.document_month ~ '^March' THEN 3
          WHEN cd.document_month ~ '^April' THEN 4
          WHEN cd.document_month ~ '^May' THEN 5
          WHEN cd.document_month ~ '^June' THEN 6
          WHEN cd.document_month ~ '^July' THEN 7
          WHEN cd.document_month ~ '^August' THEN 8
          WHEN cd.document_month ~ '^September' THEN 9
          WHEN cd.document_month ~ '^October' THEN 10
          WHEN cd.document_month ~ '^November' THEN 11
          WHEN cd.document_month ~ '^December' THEN 12
        END DESC,
        RIGHT(cd.document_month, 4) DESC
    `;
    
    const { rows } = await db.query(query);
    return rows;
  } catch (error) {
    console.error("Error fetching document status by month:", error);
    throw error;
  }
}

/**
 * Get clients with pending documents for a specific month
 * @param {string} month - Month to filter (e.g., "January 2023")
 * @returns {Promise<Array>} - Array of clients with pending documents
 */
async function getClientsPendingDocuments(month) {
  try {
    const query = `
      SELECT 
        c.id,
        c.name as client_name,
        c.email_id_1,
        c.phone_number,
        c.gst_filing_type,
        c.gst_number,
        c.gst_1_enabled,
        c.bank_statement_enabled,
        c.tds_document_enabled,
        cd.gst_1_received,
        cd.gst_1_received_date,
        cd.bank_statement_received,
        cd.bank_statement_received_date,
        cd.tds_received,
        cd.tds_received_date,
        cd.document_month
      FROM "user".clients c
      JOIN "user".client_documents cd ON c.id = cd.client_id
      WHERE cd.document_month = $1
      AND (
        (c.gst_1_enabled = true AND cd.gst_1_received = false) OR
        (c.bank_statement_enabled = true AND cd.bank_statement_received = false) OR
        (c.tds_document_enabled = true AND cd.tds_received = false)
      )
      ORDER BY c.name ASC
    `;
    
    const { rows } = await db.query(query, [month]);
    return rows;
  } catch (error) {
    console.error("Error fetching clients with pending documents:", error);
    throw error;
  }
}

module.exports = {
  getReportData,
  getDocumentStatusByMonth,
  getClientsPendingDocuments
}; 