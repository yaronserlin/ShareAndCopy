const logger = require('../utils/logger');
const responseHandler = require('../utils/responseHandler');

/**
 * Global Error Handling Middleware
 */
const errorHandler = (err, req, res, next) => {
    logger.error(err.stack);

    // Mongoose duplicate key
    if (err.code === 11000) {
        const message = 'Duplicate field value entered';
        return responseHandler.error(res, message, err, 400);
    }

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        const message = Object.values(err.errors).map(val => val.message).join(', ');
        return responseHandler.error(res, message, err, 400);
    }

    // Default error
    responseHandler.error(res, err.message || 'Server Error', err, err.statusCode || 500);
};

module.exports = errorHandler;
