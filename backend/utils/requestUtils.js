/**
 * Request utility helpers
 */

/**
 * Parse and validate a date range from query params (startDate, endDate).
 * Returns the parsed Date objects or throws an Error with a descriptive message.
 *
 * @param {Object} query - Express req.query
 * @returns {{ startDateTime: Date, endDateTime: Date }}
 * @throws {Error} with a `statusCode` property set to 400 for validation failures
 */
function parseDateRange(query) {
    const { startDate, endDate } = query;

    if (!startDate || !endDate) {
        const err = new Error('Start date and end date are required');
        err.statusCode = 400;
        throw err;
    }

    const startDateTime = new Date(startDate);
    const endDateTime = new Date(endDate);

    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
        const err = new Error('Invalid date format provided');
        err.statusCode = 400;
        throw err;
    }

    if (startDateTime > endDateTime) {
        const err = new Error('Start date cannot be greater than end date');
        err.statusCode = 400;
        throw err;
    }

    // Include the full last day
    endDateTime.setHours(23, 59, 59, 999);

    return { startDateTime, endDateTime };
}

module.exports = { parseDateRange };
