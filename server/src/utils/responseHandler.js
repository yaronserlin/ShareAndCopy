const logger = require('./logger');

const sendResponse = (res, statusCode, success, message, data = null, error = null) => {
    const response = {
        success,
        message
    };

    if (data !== null) {
        response.data = data;
    }

    if (error && process.env.NODE_ENV === 'development') {
        response.error = error;
    }

    res.status(statusCode).json(response);
};

/**
 * Send success response
 * @param {Object} res - Express response object
 * @param {any} data - Data to send
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code
 */
exports.success = (res, data, message = 'Success', statusCode = 200) => {
    sendResponse(res, statusCode, true, message, data);
};

/**
 * Send error response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {Error|string} error - Error object or string
 * @param {number} statusCode - HTTP status code
 */
exports.error = (res, message, error = null, statusCode = 500) => {
    // Log 500 errors if not already logged
    if (statusCode === 500) {
        logger.error(`Server Error: ${message} - ${error ? error.message || error : ''}`);
    }

    sendResponse(res, statusCode, false, message, null, error ? error.message || error : null);
};
