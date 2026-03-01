/**
 * agreementController.js
 *
 * Handles POST /api/agreements/generate
 * Validates input, calls agreementService, returns PDF inline.
 */
const { logger } = require('../utils/logger');
const { generatePDF } = require('../services/agreementService');

// PAN format: 5 uppercase letters, 4 digits, 1 uppercase letter
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

/**
 * @desc    Generate agreement PDF from form data
 * @route   POST /api/agreements/generate
 * @access  Private
 */
exports.generate = async (req, res, next) => {
    try {
        const { client_name, pan_number, percentage, party_name, address, agreement_date } = req.body;

        // ── Presence validation ───────────────────────────────────────────
        const missing = [];
        if (!client_name?.trim()) missing.push('client_name');
        if (!pan_number?.trim()) missing.push('pan_number');
        if (!percentage?.toString().trim()) missing.push('percentage');
        if (!party_name?.trim()) missing.push('party_name');
        if (!address?.trim()) missing.push('address');
        if (!agreement_date?.trim()) missing.push('agreement_date');

        if (missing.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Missing required fields: ${missing.join(', ')}`,
            });
        }

        // ── PAN validation ────────────────────────────────────────────────
        const normalizedPAN = pan_number.trim().toUpperCase();
        if (!PAN_REGEX.test(normalizedPAN)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid PAN format. Expected format: ABCDE1234F (5 letters, 4 digits, 1 letter)',
            });
        }

        // ── Percentage validation ─────────────────────────────────────────
        const pct = parseFloat(percentage);
        if (isNaN(pct) || pct < 0 || pct > 100) {
            return res.status(400).json({
                success: false,
                message: 'Percentage must be a number between 0 and 100',
            });
        }

        // ── Date validation ───────────────────────────────────────────────
        const parsedDate = new Date(agreement_date);
        if (isNaN(parsedDate.getTime())) {
            return res.status(400).json({
                success: false,
                message: 'Invalid agreement_date — must be a valid date',
            });
        }

        // Format date for display in PDF: e.g. "28 February 2026"
        const formattedDate = parsedDate.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });

        logger.info(`[agreementController] Generating PDF for client: ${client_name.trim()}`);

        const pdfBuffer = await generatePDF({
            client_name: client_name.trim(),
            pan_number: normalizedPAN,
            percentage: pct.toString(),
            party_name: party_name.trim(),
            address: address.trim(),
            agreement_date: formattedDate,
        });

        // Sanitize client name for filename (remove special chars)
        const safeClientName = client_name.trim().replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
        const filename = `Agreement_${safeClientName}.pdf`;

        // Return PDF inline (frontend creates object URL for iframe preview)
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename="${filename}"`,
            'Content-Length': pdfBuffer.length,
            'Cache-Control': 'no-store',
        });

        return res.send(pdfBuffer);

    } catch (error) {
        logger.error('[agreementController] Error generating PDF:', error);
        next(error);
    }
};
