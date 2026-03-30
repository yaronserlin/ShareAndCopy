/**
 * Preview: server/src/utils/responseHandler.js
 * Description: Server utility helper.
 */

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


exports.success = (res, data, message = 'Success', statusCode = 200) => {
    sendResponse(res, statusCode, true, message, data);
};


exports.error = (res, message, error = null, statusCode = 500) => {
    
    if (statusCode === 500) {
        logger.error(`Server Error: ${message} - ${error ? error.message || error : ''}`);
    }

    sendResponse(res, statusCode, false, message, null, error ? error.message || error : null);
};
