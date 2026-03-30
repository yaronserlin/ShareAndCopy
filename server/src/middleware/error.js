/**
 * Preview: server/src/middleware/error.js
 * Description: Express middleware module.
 */

const logger = require('../utils/logger');
const responseHandler = require('../utils/responseHandler');


const errorHandler = (err, req, res, next) => {
    logger.error(err.stack);

    
    if (err.code === 11000) {
        const message = 'Duplicate field value entered';
        return responseHandler.error(res, message, err, 400);
    }

    
    if (err.name === 'ValidationError') {
        const message = Object.values(err.errors).map(val => val.message).join(', ');
        return responseHandler.error(res, message, err, 400);
    }

    
    responseHandler.error(res, err.message || 'Server Error', err, err.statusCode || 500);
};

module.exports = errorHandler;
