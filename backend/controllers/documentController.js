const { logger } = require('../utils/logger');
const documentService = require('../services/documentService');
const documentQueries = require('../queries/documentQueries');
const { getFormattedMonth } = require('../utils/dateUtils');

/**
 * @desc    Get all document records
 */
exports.getAllDocuments = async (req, res, next) => {
    try {
        const result = await documentQueries.getAllDocuments();
        res.json(result);
    } catch (error) {
        logger.error('Error fetching all documents:', error);
        next(error);
    }
};

/**
 * @desc    Get all document records for a specific month
 */
exports.getDocumentsByMonth = async (req, res, next) => {
    try {
        const { month } = req.params;
        const documents = await documentQueries.getDocumentsByMonth(month);
        res.json(documents);
    } catch (error) {
        logger.error('Error fetching document records for month:', error);
        next(error);
    }
};

/**
 * @desc    Get a document record by ID
 */
exports.getDocumentById = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (isNaN(parseInt(id))) {
            return res.status(400).json({ success: false, message: 'Invalid document ID' });
        }

        const document = await documentQueries.getDocumentById(id);

        if (!document) {
            return res.status(404).json({ success: false, message: 'Document record not found' });
        }

        res.json(document);
    } catch (error) {
        logger.error('Error fetching document record:', error);
        next(error);
    }
};

/**
 * @desc    Update a document record
 */
exports.updateDocument = async (req, res, next) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const updatedDocument = await documentQueries.updateDocument(id, updates);

        if (!updatedDocument) {
            return res.status(404).json({ success: false, message: 'Document record not found' });
        }

        res.json(updatedDocument);
    } catch (error) {
        if (error.message === 'No valid updates provided') {
            return res.status(400).json({ success: false, message: error.message });
        }
        logger.error('Error updating document record:', error);
        next(error);
    }
};

/**
 * @desc    Delete a document record
 */
exports.deleteDocument = async (req, res, next) => {
    try {
        const { id } = req.params;
        const deleted = await documentQueries.deleteDocument(id);

        if (!deleted) {
            return res.status(404).json({ success: false, message: 'Document record not found' });
        }

        res.json({ success: true, message: 'Document record deleted successfully' });
    } catch (error) {
        logger.error('Error deleting document record:', error);
        next(error);
    }
};

/**
 * @desc    Create document records for all clients for the current month
 */
exports.createDocumentsForAll = async (req, res, next) => {
    try {
        const { month } = req.body;
        const documentMonth = month || getFormattedMonth();

        const totalClients = await documentQueries.getClientCount();

        if (totalClients === 0) {
            return res.status(200).json({
                message: 'No clients found to create documents for',
                count: 0,
                existingCount: 0,
                totalClients: 0,
                currentMonth: documentMonth,
            });
        }

        const existingCount = await documentQueries.getExistingDocumentCount(documentMonth);
        const results = await documentService.createDocumentsForAllClients(documentMonth);
        const newCount = results.length;

        res.status(201).json({
            message: `Created ${newCount} new document records for ${documentMonth}`,
            count: newCount,
            existingCount,
            totalClients,
            currentMonth: documentMonth,
        });
    } catch (error) {
        logger.error('Error creating documents for all clients:', error);
        next(error);
    }
};

/**
 * @desc    Create document record for a specific client for the current month
 */
exports.createDocumentForClient = async (req, res, next) => {
    try {
        const { clientId } = req.params;
        const { month } = req.body;
        const documentMonth = month || getFormattedMonth();

        const client = await documentQueries.getClientForDocument(clientId);

        if (!client) {
            return res.status(404).json({ success: false, message: 'Client not found' });
        }

        const existingDoc = await documentQueries.getExistingDocument(clientId, documentMonth);

        let documentId;
        let isNewDocument = false;

        if (existingDoc) {
            documentId = existingDoc.id;
        } else {
            const document = await documentService.createDocumentForClient(clientId, documentMonth);
            documentId = document.id;
            isNewDocument = true;
        }

        const documentRecord = await documentQueries.getDocumentById(documentId);

        res.status(isNewDocument ? 201 : 200).json({
            message: isNewDocument
                ? `Created new document record for client ${client.name} for ${documentMonth}`
                : `Document for client ${client.name} for ${documentMonth} already exists`,
            isNewDocument,
            currentMonth: documentMonth,
            document: documentRecord,
        });
    } catch (error) {
        logger.error(`Error creating document for client ${req.params.clientId}:`, error);
        next(error);
    }
};