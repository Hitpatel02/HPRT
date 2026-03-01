const { logger } = require('../utils/logger');
const { sendClientReminder } = require('../services/whatsappService');
const clientQueries = require('../queries/clientQueries');

/**
 * @desc    Get all clients
 */
exports.getAllClients = async (req, res, next) => {
    try {
        const clients = await clientQueries.getAllClients();
        res.json(clients);
    } catch (error) {
        logger.error('Error fetching clients:', error);
        next(error);
    }
};

/**
 * @desc    Get client by ID
 */
exports.getClientById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const client = await clientQueries.getClientById(id);

        if (!client) {
            return res.status(404).json({ success: false, message: 'Client not found' });
        }

        res.json(client);
    } catch (error) {
        logger.error('Error fetching client by ID:', error);
        next(error);
    }
};

/**
 * @desc    Create a new client
 */
exports.createClient = async (req, res, next) => {
    try {
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
            gst_number,
        } = req.body;

        if (!name) {
            return res.status(400).json({ success: false, message: 'Client name is required' });
        }

        const client = await clientQueries.createClient({
            name, phone_number, email_id_1, email_id_2, email_id_3,
            gst_1_enabled, tds_document_enabled, bank_statement_enabled,
            gst_filing_type, whatsapp_group_id, gst_number,
        });

        res.status(201).json(client);
    } catch (error) {
        logger.error('Error creating client:', error);
        next(error);
    }
};

/**
 * @desc    Update client details
 */
exports.updateClient = async (req, res, next) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const updatedClient = await clientQueries.updateClient(id, updates);

        if (!updatedClient) {
            return res.status(404).json({ success: false, message: 'Client not found' });
        }

        res.json(updatedClient);
    } catch (error) {
        if (error.message === 'No valid updates provided') {
            return res.status(400).json({ success: false, message: error.message });
        }
        logger.error('Error updating client:', error);
        next(error);
    }
};

/**
 * @desc    Delete a client
 */
exports.deleteClient = async (req, res, next) => {
    try {
        const { id } = req.params;

        const exists = await clientQueries.clientExists(id);
        if (!exists) {
            return res.status(404).json({ success: false, message: 'Client not found' });
        }

        await clientQueries.deleteClient(id);
        res.json({ success: true, message: 'Client deleted successfully' });
    } catch (error) {
        logger.error('Error deleting client:', error);
        next(error);
    }
};

/**
 * @desc    Send WhatsApp reminder to a client
 */
exports.sendClientWhatsAppReminder = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { reminderType } = req.body;

        if (!reminderType || !['gst', 'tds', 'bank'].includes(reminderType)) {
            return res.status(400).json({ success: false, message: 'Valid reminder type is required (gst, tds, or bank)' });
        }

        const client = await clientQueries.getClientById(id);
        if (!client) {
            return res.status(404).json({ success: false, message: 'Client not found' });
        }

        const featureMap = { gst: 'gst_1_enabled', tds: 'tds_document_enabled', bank: 'bank_statement_enabled' };
        if (!client[featureMap[reminderType]]) {
            return res.status(400).json({
                success: false,
                message: `Client does not have ${reminderType.toUpperCase()} service enabled`,
            });
        }

        const settingsResult = await clientQueries.getReminderSettings();
        if (!settingsResult || settingsResult.length === 0) {
            return res.status(404).json({ success: false, message: 'Reminder settings not found' });
        }

        const result = await sendClientReminder(client, reminderType, settingsResult[0], true);

        if (result.success) {
            res.json({ success: true, message: `${reminderType.toUpperCase()} reminder sent successfully` });
        } else {
            throw new Error(result.error || 'Failed to send reminder');
        }
    } catch (error) {
        logger.error(`Error sending ${req.body?.reminderType || 'unknown'} reminder:`, error);
        next(error);
    }
};

/**
 * @desc    Get reporting status for a client
 */
exports.getClientStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const clientCheck = await clientQueries.getClientById(id);

        if (!clientCheck) {
            return res.status(404).json({ success: false, message: 'Client not found' });
        }

        res.json({
            gst: { enabled: clientCheck.gst_1_enabled, status: clientCheck.gst_1_enabled ? 'active' : 'inactive' },
            tds: { enabled: clientCheck.tds_document_enabled, status: clientCheck.tds_document_enabled ? 'active' : 'inactive' },
            bank: { enabled: clientCheck.bank_statement_enabled, status: clientCheck.bank_statement_enabled ? 'active' : 'inactive' },
        });
    } catch (error) {
        logger.error('Error fetching client status:', error);
        next(error);
    }
};

/**
 * @desc    Update reporting status for a client
 */
exports.updateClientStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { statusType, enabled } = req.body;

        if (!statusType || !['gst', 'tds', 'bank'].includes(statusType)) {
            return res.status(400).json({ success: false, message: 'Valid status type is required (gst, tds, or bank)' });
        }

        if (enabled === undefined) {
            return res.status(400).json({ success: false, message: 'Enabled status is required' });
        }

        const fieldMap = { gst: 'gst_1_enabled', tds: 'tds_document_enabled', bank: 'bank_statement_enabled' };

        const updateResult = await clientQueries.updateClientStatus(id, fieldMap[statusType], enabled);
        if (!updateResult) {
            return res.status(404).json({ success: false, message: 'Client not found' });
        }

        res.json({
            success: true,
            message: `${statusType.toUpperCase()} status updated successfully`,
            type: statusType,
            enabled,
        });
    } catch (error) {
        logger.error('Error updating client status:', error);
        next(error);
    }
};

/**
 * @desc    Get all documents for a client
 */
exports.getClientDocuments = async (req, res, next) => {
    try {
        const { id } = req.params;

        const clientCheck = await clientQueries.getClientById(id);
        if (!clientCheck) {
            return res.status(404).json({ success: false, message: 'Client not found' });
        }

        const result = await clientQueries.getClientDocuments(id);
        res.json(result);
    } catch (error) {
        logger.error('Error fetching client documents:', error);
        next(error);
    }
};