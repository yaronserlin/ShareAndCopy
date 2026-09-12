/**
 * Express error-handling middleware. Translates known Mongoose/MongoDB
 * error shapes into friendly messages and falls back to a generic 500.
 */

const logger = require('../utils/logger');
const responseHandler = require('../utils/responseHandler');

/**
 * Centralized Express error handler; must be registered last, after all
 * routes.
 */
const errorHandler = (err, req, res, next) => {
    const log = req.log || logger;

    if (err.message === 'Not allowed by CORS') {
        // Already logged (at `warn`) by the CORS middleware itself.
        return responseHandler.error(res, 'Not allowed by CORS', null, 403, { log: false });
    }

    log.error(`Unhandled error: ${req.method} ${req.originalUrl} - IP: ${req.ip}`, err);

    if (err.code === 11000) {
        const message = 'Duplicate field value entered';
        return responseHandler.error(res, message, err, 400, { log: false });
    }

    if (err.name === 'ValidationError') {
        const message = Object.values(err.errors).map(val => val.message).join(', ');
        return responseHandler.error(res, message, err, 400, { log: false });
    }

    responseHandler.error(res, err.message || 'Server Error', err, err.statusCode || 500, { log: false });
};

module.exports = errorHandler;
