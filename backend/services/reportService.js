const fs = require('fs');
const PDFPrinter = require('pdfmake');
const path = require('path');
const reportQueries = require('../queries/reportQueries');

/**
 * Format date for PDF display (DD/MM/YYYY)
 * @param {string} dateString - ISO date string
 * @returns {string} - Formatted date
 */
const formatDateForPDF = (dateString) => {
    try {
        const date = new Date(dateString);
        
        // Get day and month as 2-digit numbers
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        
        // Get full year
        const year = date.getFullYear();
        
        // Return as DD/MM/YYYY
        return `${day}/${month}/${year}`;
    } catch (error) {
        console.error('Error formatting date:', error);
        return dateString || '-';
    }
};

/**
 * Get report data for display in the frontend
 * @param {string} startDate - Optional start date for filtering (YYYY-MM-DD)
 * @param {string} endDate - Optional end date for filtering (YYYY-MM-DD)
 * @returns {Promise<Array>} - Array of document records
 */
const getReportData = async (startDate, endDate) => {
    try {
        console.log(`Fetching report data with date range: ${startDate} to ${endDate}`);
        
        // Get all documents with client details
        const allDocuments = await reportQueries.getReportData();
        
        // Parse start and end dates if provided
        const startDateObj = startDate ? new Date(startDate) : null;
        const endDateObj = endDate ? new Date(endDate) : null;
        
        if (startDateObj) {
            startDateObj.setHours(0, 0, 0, 0); // Start of day
            console.log(`Start date: ${startDateObj.toISOString()}`);
        }
        
        if (endDateObj) {
            endDateObj.setHours(23, 59, 59, 999); // End of day
            console.log(`End date: ${endDateObj.toISOString()}`);
        }
        
        // Filter documents based on our requirements
        const filteredDocuments = allDocuments.filter(doc => {
            // If no date range is specified, include all documents
            if (!startDateObj && !endDateObj) {
                return true;
            }
            
            // Parse document month (format: "Month Year")
            const [monthStr, yearStr] = (doc.document_month || '').split(' ');
            if (!monthStr || !yearStr) {
                return false;
            }
            
            // Convert month string to number (0-11)
            const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                          'July', 'August', 'September', 'October', 'November', 'December'];
            const month = months.indexOf(monthStr);
            if (month === -1) {
                return false;
            }
            
            const year = parseInt(yearStr);
            if (isNaN(year)) {
                return false;
            }
            
            // Create a date for the first day of the document's month
            const documentMonthDate = new Date(year, month, 1);
            
            // Create a date for the last day of the document's month
            const lastDay = new Date(year, month + 1, 0).getDate();
            const documentMonthEndDate = new Date(year, month, lastDay, 23, 59, 59, 999);
            
            // Check if document month falls within the date range
            const monthInRange = 
                (!startDateObj || documentMonthEndDate >= startDateObj) && 
                (!endDateObj || documentMonthDate <= endDateObj);
            
            // If document month is in range, include it
            if (monthInRange) {
                console.log(`Including document for ${doc.client_name}, month ${doc.document_month} is in range`);
                return true;
            }
            
            // Check if client has any pending documents based on what's enabled
            const hasGstPending = doc.gst_1_enabled && !doc.gst_1_received;
            const hasBankPending = doc.bank_statement_enabled && !doc.bank_statement_received;
            const hasTdsPending = doc.tds_document_enabled && !doc.tds_received;
            
            // Check if ANY document was submitted within the date range
            const gstSubmitDate = doc.gst_1_received_date ? new Date(doc.gst_1_received_date) : null;
            const bankSubmitDate = doc.bank_statement_received_date ? new Date(doc.bank_statement_received_date) : null;
            const tdsSubmitDate = doc.tds_received_date ? new Date(doc.tds_received_date) : null;
            
            // Check GST submission date
            if (doc.gst_1_enabled && doc.gst_1_received && gstSubmitDate) {
                if ((!startDateObj || gstSubmitDate >= startDateObj) && 
                    (!endDateObj || gstSubmitDate <= endDateObj)) {
                    console.log(`Including document for ${doc.client_name}, GST Received on ${gstSubmitDate.toISOString()}`);
                    return true; // Include immediately if any date is in range
                }
            }
            
            // Check Bank Statement submission date
            if (doc.bank_statement_enabled && doc.bank_statement_received && bankSubmitDate) {
                if ((!startDateObj || bankSubmitDate >= startDateObj) && 
                    (!endDateObj || bankSubmitDate <= endDateObj)) {
                    console.log(`Including document for ${doc.client_name}, Bank Statement Received on ${bankSubmitDate.toISOString()}`);
                    return true; // Include immediately if any date is in range
                }
            }
            
            // Check TDS submission date
            if (doc.tds_document_enabled && doc.tds_received && tdsSubmitDate) {
                if ((!startDateObj || tdsSubmitDate >= startDateObj) && 
                    (!endDateObj || tdsSubmitDate <= endDateObj)) {
                    console.log(`Including document for ${doc.client_name}, TDS Received on ${tdsSubmitDate.toISOString()}`);
                    return true; // Include immediately if any date is in range
                }
            }
            
            // If there are any pending documents, check if they fall within the date range
            if (hasGstPending || hasBankPending || hasTdsPending) {
                // For pending documents, use document creation date or last update date if available
                let documentActivityDate = doc.created_at ? new Date(doc.created_at) : null;
                if (doc.updated_at) {
                    documentActivityDate = new Date(doc.updated_at);
                }
                
                // If no activity date found, use the document month date
                if (!documentActivityDate) {
                    documentActivityDate = documentMonthDate;
                }
                
                // Include if document activity date is within date range
                if ((!startDateObj || documentActivityDate >= startDateObj) && 
                    (!endDateObj || documentActivityDate <= endDateObj)) {
                    console.log(`Including pending document for ${doc.client_name}, activity date ${documentActivityDate.toISOString()}`);
                    return true;
                }
            }
            
            // If we get here, this document doesn't meet any criteria for inclusion
            return false;
        });
        
        console.log(`Filtered ${allDocuments.length} documents to ${filteredDocuments.length}`);
        return filteredDocuments;
    } catch (error) {
        console.error("❌ Error fetching report data:", error);
        throw error;
    }
};

/**
 * Generate a monthly report of GST document status for all clients
 * @param {string} startDate - Optional start date for filtering (YYYY-MM-DD)
 * @param {string} endDate - Optional end date for filtering (YYYY-MM-DD)
 * @returns {Promise<string>} - Path to the generated PDF file
 */
const generateMonthlyReport = async (startDate, endDate) => {
    try {
        // Get the report data
        const documents = await getReportData(startDate, endDate);

        // Create reports directory if it doesn't exist
        if (!fs.existsSync("reports")) {
            fs.mkdirSync("reports");
        }

        const filePath = 'reports/monthly_report.pdf';
        
        // Use standard fonts instead of Roboto to avoid font issues
        const fontDescriptors = {
            Helvetica: {
                normal: 'Helvetica',
                bold: 'Helvetica-Bold',
                italics: 'Helvetica-Oblique',
                bolditalics: 'Helvetica-BoldOblique'
            }
        };
        
        const printer = new PDFPrinter(fontDescriptors);
        
        // Create title with date range information
        let title = 'GST Document Status Report';
        if (startDate && endDate) {
            title += ` (${startDate} to ${endDate})`;
        } else if (startDate) {
            title += ` (From ${startDate})`;
        } else if (endDate) {
            title += ` (To ${endDate})`;
        }
        
        const docDefinition = {
            pageSize: 'A4',
            pageOrientation: 'landscape', // Use landscape orientation for more width
            pageMargins: [10, 15, 10, 15], // Very narrow margins to maximize table space
            footer: function(currentPage, pageCount) { 
                return { text: `Page ${currentPage} of ${pageCount}`, alignment: 'center', fontSize: 8 };
            },
            content: [
                { text: title, style: 'header', alignment: 'center' },
                { text: `Generated on: ${new Date().toLocaleDateString()}`, alignment: 'center', margin: [0, 0, 0, 15] },
                {
                    style: 'tableExample',
                    table: {
                        // Optimize column widths with wider date columns
                        widths: [15, '*', 50, 35, 40, 50, 40, 50, 40, 50, 40, 60],
                        headerRows: 1,
                        keepWithHeaderRows: 1,
                        // Ensure consistent table layout
                        layout: {
                            hLineWidth: function(i, node) { return 0.5; },
                            vLineWidth: function(i, node) { return 0.5; },
                            hLineColor: function(i, node) { return '#dddddd'; },
                            vLineColor: function(i, node) { return '#dddddd'; },
                            paddingLeft: function(i, node) { return 4; },
                            paddingRight: function(i, node) { return 4; },
                            paddingTop: function(i, node) { return 2; },
                            paddingBottom: function(i, node) { return 2; }
                        },
                        body: [
                            [
                                { text: 'Sr', style: 'tableHeader', alignment: 'center' },
                                { text: 'Client Name', style: 'tableHeader', alignment: 'left' },
                                { text: 'Month', style: 'tableHeader', alignment: 'center' },
                                { text: 'GST Type', style: 'tableHeader', alignment: 'center' },
                                { text: 'GST Number', style: 'tableHeader', alignment: 'center' },
                                { text: 'GST 1', style: 'tableHeader', alignment: 'center' },
                                { text: 'GST Date', style: 'tableHeader', alignment: 'center' },
                                { text: 'Bank Stmt', style: 'tableHeader', alignment: 'center' },
                                { text: 'Bank Date', style: 'tableHeader', alignment: 'center' },
                                { text: 'TDS Stmt', style: 'tableHeader', alignment: 'center' },
                                { text: 'TDS Date', style: 'tableHeader', alignment: 'center' },
                                { text: 'Notes', style: 'tableHeader', alignment: 'center' }
                            ],
                            ...documents.map((doc, index) => [
                                { text: index + 1, alignment: 'center' },
                                { text: doc.client_name, alignment: 'left' },
                                { text: doc.document_month, alignment: 'center' },
                                { text: doc.gst_filing_type || '-', alignment: 'center' },
                                { text: doc.gst_number || '-', alignment: 'center' },
                                { 
                                    text: doc.gst_1_enabled ? 
                                          (doc.gst_1_received ? 'Received' : 'Pending') : 
                                          '-',
                                    alignment: 'center' 
                                },
                                {
                                    text: (doc.gst_1_enabled && doc.gst_1_received && doc.gst_1_received_date) ?
                                          formatDateForPDF(doc.gst_1_received_date) : '-',
                                    alignment: 'center',
                                    noWrap: true
                                },
                                { 
                                    text: doc.bank_statement_enabled ? 
                                          (doc.bank_statement_received ? 'Received' : 'Pending') : 
                                          '-',
                                    alignment: 'center' 
                                },
                                {
                                    text: (doc.bank_statement_enabled && doc.bank_statement_received && doc.bank_statement_received_date) ?
                                          formatDateForPDF(doc.bank_statement_received_date) : '-',
                                    alignment: 'center',
                                    noWrap: true
                                },
                                { 
                                    // Show "Received" if TDS was received, even if currently disabled
                                    text: doc.tds_received ? 'Received' : 
                                          (doc.tds_document_enabled ? 'Pending' : '-'),
                                    alignment: 'center' 
                                },
                                {
                                    // Show TDS date if it exists, even if TDS is currently disabled
                                    text: (doc.tds_received && doc.tds_received_date) ?
                                          formatDateForPDF(doc.tds_received_date) : '-',
                                    alignment: 'center',
                                    noWrap: true
                                },
                                { text: doc.notes || '-', alignment: 'center' }
                            ])
                        ]
                    }
                }
            ],
            styles: {
                header: {
                    fontSize: 16,
                    bold: true,
                    margin: [0, 0, 0, 10]
                },
                tableExample: {
                    margin: [0, 5, 0, 15]
                },
                tableHeader: {
                    bold: true,
                    fontSize: 9,
                    color: 'black',
                    fillColor: '#f3f3f3'
                }
            },
            defaultStyle: {
                font: 'Helvetica',
                fontSize: 8 // Smaller font size for better fit with more columns
            }
        };

        const pdfDoc = printer.createPdfKitDocument(docDefinition);
        pdfDoc.pipe(fs.createWriteStream(filePath));
        pdfDoc.end();

        return new Promise((resolve, reject) => {
            pdfDoc.on("end", () => {
                console.log("✅ Report generated successfully");
                resolve(filePath);
            });
            
            pdfDoc.on("error", (error) => {
                console.error("❌ Error generating PDF:", error);
                reject(error);
            });
        });
    } catch (error) {
        console.error("❌ Error generating report:", error);
        throw error;
    }
};

/**
 * Get document status summary by month
 * @returns {Promise<Array>} - Array of document status counts by month
 */
const getDocumentStatusByMonth = async () => {
    try {
        return await reportQueries.getDocumentStatusByMonth();
    } catch (error) {
        console.error('Error getting document status by month:', error);
        throw error;
    }
};

/**
 * Get clients with pending documents for a month
 * @param {string} month - The month to check for pending documents
 * @returns {Promise<Array>} - Array of clients with pending documents
 */
const getClientsPendingDocuments = async (month) => {
    try {
        if (!month) {
            throw new Error('Month parameter is required');
        }
        
        return await reportQueries.getClientsPendingDocuments(month);
    } catch (error) {
        console.error('Error getting clients with pending documents:', error);
        throw error;
    }
};

module.exports = {
    getReportData,
    generateMonthlyReport,
    getDocumentStatusByMonth,
    getClientsPendingDocuments
}; 