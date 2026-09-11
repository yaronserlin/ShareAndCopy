/**
 * Joi validation schemas for the auth endpoints (register, login, revoke).
 */

const Joi = require('joi');

/** Schema for `POST /auth/register`. */
const registerSchema = Joi.object({
    email: Joi.string().email().required().messages({
        'string.email': 'Please provide a valid email',
        'any.required': 'Email is required'
    }),
    password: Joi.string().min(8)
        .pattern(new RegExp('(?=.*[a-z])'), 'lowercase')
        .pattern(new RegExp('(?=.*[A-Z])'), 'uppercase')
        .pattern(new RegExp('(?=.*[0-9])'), 'number')
        .required()
        .messages({
            'string.min': 'Password must be at least 8 characters long',
            'string.pattern.name': 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
        }),
    firstName: Joi.string().pattern(/^\p{L}+(?:[' -]\p{L}+)*$/u).required().messages({
        'string.pattern.base': 'First name must contain only letters'
    }),
    lastName: Joi.string().pattern(/^\p{L}+(?:[' -]\p{L}+)*$/u).required().messages({
        'string.pattern.base': 'Last name must contain only letters'
    })
});

/** Schema for `POST /auth/login`. */
const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
    deviceId: Joi.string().optional(),
    deviceName: Joi.string().optional()
});

/** Schema for `POST /auth/revoke`. */
const revokeSchema = Joi.object({
    deviceId: Joi.string().pattern(/^[a-zA-Z0-9_-]+$/).required().messages({
        'string.pattern.base': 'DeviceID contains invalid characters',
        'any.required': 'DeviceID is required'
    })
});

module.exports = {
    registerSchema,
    loginSchema,
    revokeSchema
};
