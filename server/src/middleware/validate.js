/**
 * Middleware factory that validates request data against a Joi schema.
 */

const Joi = require('joi');
const responseHandler = require('../utils/responseHandler');

/**
 * Creates Express middleware that validates `req[property]` against a
 * Joi schema, responding with 400 on the first validation failure.
 *
 * @param {import('joi').Schema} schema
 * @param {'body'|'params'|'query'} [property='body']
 * @returns {import('express').RequestHandler}
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
