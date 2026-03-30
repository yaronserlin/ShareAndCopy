/**
 * Preview: server/src/middleware/validate.js
 * Description: Express middleware module.
 */

const Joi = require('joi');
const responseHandler = require('../utils/responseHandler');


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
