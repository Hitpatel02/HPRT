const { logger } = require('../utils/logger');
const fs = require('fs');
const path = require('path');
const {
    generateMonthlyReport,
    getReportData,
    getDocumentStatusByMonth,
    getClientsPendingDocuments,
} = require('../services/reportService');
const { Parser } = require('json2csv');
const { formatDateToDDMMYYYY } = require('../utils/dateUtils');

/**
 * @desc    Generate a new monthly report with optional date filtering
 */
exports.generateReport = async (req, res, next) => {
    try {
        const { startDate, endDate } = req.query;
        const filePath = await generateMonthlyReport(startDate, endDate);
        res.json({
            success: true,
            message: 'Report generated successfully',
            filePath,
            dateRange: { startDate, endDate },
        });
    } catch (error) {
        logger.error('Error generating report:', error);
        next(error);
    }
};

/**
 * @desc    Get report data for display in the frontend
 */
exports.getReportData = async (req, res, next) => {
    try {
        const { startDate, endDate } = req.query;
        const data = await getReportData(startDate, endDate);
        res.json(data);
    } catch (error) {
        logger.error('Error fetching report data:', error);
        next(error);
    }
};

/**
 * @desc    Get document status summary by month
 */
exports.getDocumentStatusByMonth = async (req, res, next) => {
    try {
        const data = await getDocumentStatusByMonth();
        res.json(data);
    } catch (error) {
        logger.error('Error fetching document status by month:', error);
        next(error);
    }
};

/**
 * @desc    Get clients with pending documents for a specific month
 */
exports.getClientsPendingDocuments = async (req, res, next) => {
    try {
        const { month } = req.params;

        if (!month) {
            return res.status(400).json({ success: false, message: 'Month parameter is required' });
        }

        const data = await getClientsPendingDocuments(month);
        res.json(data);
    } catch (error) {
        logger.error('Error fetching clients with pending documents:', error);
        next(error);
    }
};

/**
 * @desc    Download the latest generated report
 */
exports.downloadReport = (req, res, next) => {
    try {
        const { startDate, endDate } = req.query;
        let fileName = 'HPRT_Report';

        if (startDate && endDate) {
            fileName = `HPRT_Report_${startDate}_to_${endDate}`;
        } else if (startDate) {
            fileName = `HPRT_Report_from_${startDate}`;
        } else if (endDate) {
            fileName = `HPRT_Report_to_${endDate}`;
        }

        const filePath = path.join(process.cwd(), 'reports', 'monthly_report.pdf');

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ success: false, message: 'Report not found. Please generate it first.' });
        }

        res.download(filePath, `${fileName}.pdf`);
    } catch (error) {
        logger.error('Error downloading report:', error);
        next(error);
    }
};

/**
 * @desc    Download report data as CSV
 */
exports.downloadReportCSV = async (req, res, next) => {
    try {
        const { startDate, endDate } = req.query;
        let fileName = 'HPRT_Monthly_Report';

        if (startDate && endDate) {
            fileName = `HPRT_Monthly_Report_${startDate}_to_${endDate}`;
        } else if (startDate) {
            fileName = `HPRT_Monthly_Report_from_${startDate}`;
        } else if (endDate) {
            fileName = `HPRT_Monthly_Report_to_${endDate}`;
        }

        const reportData = await getReportData(startDate, endDate);

        if (!reportData || reportData.length === 0) {
            return res.status(404).json({ success: false, message: 'No report data found for the selected date range.' });
        }

        const cleanData = reportData.map(doc => ({
            client_name: doc.client_name || '',
            document_month: doc.document_month || '',
            gst_filing_type: doc.gst_filing_type || '',
            gst_number: doc.gst_number || '',
            gst_1_status: doc.gst_1_enabled ? (doc.gst_1_received ? 'Received' : 'Pending') : 'Not Required',
            gst_1_date: doc.gst_1_enabled && doc.gst_1_received && doc.gst_1_received_date
                ? formatDateToDDMMYYYY(doc.gst_1_received_date) : '',
            bank_statement_status: doc.bank_statement_enabled ? (doc.bank_statement_received ? 'Received' : 'Pending') : 'Not Required',
            bank_statement_date: doc.bank_statement_enabled && doc.bank_statement_received && doc.bank_statement_received_date
                ? formatDateToDDMMYYYY(doc.bank_statement_received_date) : '',
            tds_status: doc.tds_document_enabled ? (doc.tds_received ? 'Received' : 'Pending') : 'Not Required',
            tds_date: doc.tds_document_enabled && doc.tds_received && doc.tds_received_date
                ? formatDateToDDMMYYYY(doc.tds_received_date) : '',
            notes: doc.notes || '',
        }));

        const csvHeader = 'Client Name                                   ,Month                          ,GST Type                        ,GST Number                              ,GST Status                     ,GST Date                        ,Bank Statement Status                                    ,Bank Statement Date                   ,TDS Status                     ,TDS Date                        ,Notes\n';

        const csvRows = cleanData.map(row => [
            `"${row.client_name}"`,
            `"${row.document_month}"`,
            `"${row.gst_filing_type}"`,
            `"${row.gst_number}"`,
            `"${row.gst_1_status}"`,
            `"${row.gst_1_date}"`,
            `"${row.bank_statement_status}"`,
            `"${row.bank_statement_date}"`,
            `"${row.tds_status}"`,
            `"${row.tds_date}"`,
            `"${(row.notes || '').replace(/"/g, '""')}"`,
        ].join(',')).join('\n');

        const csvContent = `sep=,\nHPRT Monthly Report (${startDate || ''} to ${endDate || ''})\nGenerated on: ${formatDateToDDMMYYYY(new Date())}\n\n${csvHeader}${csvRows}`;

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=${fileName}.csv`);
        res.send(csvContent);
    } catch (error) {
        logger.error('Error downloading report as CSV:', error);
        next(error);
    }
};