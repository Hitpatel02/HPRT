const { logger } = require('../utils/logger');

/**
 * Centralized Express error-handling middleware.
 * Must be registered AFTER all routes with exactly 4 parameters.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
    const status = err.status || err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    logger.error(`[${req.method}] ${req.originalUrl} — ${status}: ${message}`, {
        stack: err.stack,
        body: req.body,
    });

    res.status(status).json({
        success: false,
        message,
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
    });
}

module.exports = { errorHandler };
