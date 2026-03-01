/**
 * 404 Not Found handler.
 * Must be registered AFTER all valid routes and BEFORE the errorHandler.
 */
function notFound(req, res, next) {
    const err = new Error(`Not Found — ${req.originalUrl}`);
    err.status = 404;
    next(err);
}

module.exports = { notFound };
