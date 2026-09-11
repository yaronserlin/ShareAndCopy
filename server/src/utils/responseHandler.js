/**
 * Standardized JSON response helpers for controllers, ensuring a
 * consistent `{ success, message, data }` response shape.
 */

const logger = require('./logger');

/**
 * Builds and sends the standardized response envelope. Error details
 * are included in the response body only in development.
 */
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

/** Sends a successful (`success: true`) JSON response. */
exports.success = (res, data, message = 'Success', statusCode = 200) => {
    sendResponse(res, statusCode, true, message, data);
};

/** Sends an error (`success: false`) JSON response, logging 500s. */
exports.error = (res, message, error = null, statusCode = 500) => {
    if (statusCode === 500) {
        logger.error(`Server Error: ${message} - ${error ? error.message || error : ''}`);
    }

    sendResponse(res, statusCode, false, message, null, error ? error.message || error : null);
};
