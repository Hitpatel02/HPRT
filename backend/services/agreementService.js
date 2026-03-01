/**
 * agreementService.js
 *
 * Generates a PDF from the agreement HTML template by:
 *  1. Reading the template file
 *  2. Replacing {{placeholder}} tokens with sanitized input values
 *  3. Launching a single-use Puppeteer instance
 *  4. Printing to PDF (A4, professional margins)
 *  5. Closing the browser (always, via finally)
 *  6. Returning the raw Buffer — never writes to disk
 */
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const { logger } = require('../utils/logger');

const TEMPLATE_PATH = path.resolve(__dirname, '../templates/agreementTemplate.html');

// ── Sanitize user input to prevent HTML injection ──────────────────────────
function sanitize(value) {
    if (value === null || value === undefined) return '';
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Generate an A4 PDF from the agreement template.
 *
 * @param {Object} data
 * @param {string} data.client_name
 * @param {string} data.pan_number
 * @param {string} data.percentage
 * @param {string} data.party_name
 * @param {string} data.address
 * @param {string} data.agreement_date
 * @returns {Promise<Buffer>} Raw PDF buffer
 */
async function generatePDF(data) {
    // Read template
    let html;
    try {
        html = fs.readFileSync(TEMPLATE_PATH, 'utf8');
    } catch (err) {
        logger.error('[agreementService] Failed to read template:', err);
        throw new Error('Agreement template not found. Contact system administrator.');
    }

    // Replace placeholders with sanitized values
    const replacements = {
        '{{client_name}}': sanitize(data.client_name),
        '{{pan_number}}': sanitize(data.pan_number),
        '{{percentage}}': sanitize(data.percentage),
        '{{party_name}}': sanitize(data.party_name),
        '{{address}}': sanitize(data.address),
        '{{agreement_date}}': sanitize(data.agreement_date),
    };

    // Global replace for every placeholder (template may repeat them)
    for (const [key, value] of Object.entries(replacements)) {
        html = html.split(key).join(value);
    }

    logger.info(`[agreementService] Generating PDF for: ${data.client_name}`);

    let browser = null;
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--disable-extensions',
                '--no-first-run',
                '--no-zygote',
            ],
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
        });

        const page = await browser.newPage();

        // Load HTML directly — no file write needed
        await page.setContent(html, {
            waitUntil: 'networkidle0', // Wait for fonts (Google Fonts) to load
            timeout: 30000,
        });

        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '20mm',
                bottom: '25mm',
                left: '20mm',
                right: '20mm',
            },
            displayHeaderFooter: true,
            headerTemplate: '<div></div>',
            footerTemplate: `
        <div style="width:100%;font-size:8px;color:#888;text-align:center;padding-bottom:4mm;">
          Page <span class="pageNumber"></span> of <span class="totalPages"></span>
        </div>`,
        });

        logger.info(`[agreementService] PDF generated (${pdfBuffer.length} bytes) for: ${data.client_name}`);
        return pdfBuffer;

    } catch (err) {
        logger.error('[agreementService] Puppeteer error:', err);
        throw new Error(`PDF generation failed: ${err.message}`);
    } finally {
        // Always close the browser to prevent process leak
        if (browser) {
            try {
                await browser.close();
                logger.debug('[agreementService] Browser closed');
            } catch (closeErr) {
                logger.warn('[agreementService] Error closing browser:', closeErr.message);
            }
        }
    }
}

module.exports = { generatePDF };
