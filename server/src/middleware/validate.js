const Joi = require('joi');
const responseHandler = require('../utils/responseHandler');

/**
 * Middleware to validate request data against a Joi schema
 * @param {Object} schema - Joi schema object
 * @param {string} property - Request property to validate (body, query, params)
 */
const validate = (schema, property = 'body') => {
    return (req, res, next) => {
        const { error } = schema.validate(req[property], { abortEarly: false });

        if (error) {
            const message = error.details.map(detail => detail.message).join(', ');
            return responseHandler.error(res, message, error, 400);
        }

        next();
    };
};

module.exports = validate;
