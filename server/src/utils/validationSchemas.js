const Joi = require('joi');

const registerSchema = Joi.object({
    email: Joi.string().email().required().messages({
        'string.email': 'Please provide a valid email',
        'any.required': 'Email is required'
    }),
    // Password must be at least 8 chars, 1 uppercase, 1 lowercase, 1 number.
    // We removed the strictly alphanumeric regex.
    password: Joi.string().min(8)
        .pattern(new RegExp('(?=.*[a-z])'), 'lowercase')
        .pattern(new RegExp('(?=.*[A-Z])'), 'uppercase')
        .pattern(new RegExp('(?=.*[0-9])'), 'number')
        .required()
        .messages({
            'string.min': 'Password must be at least 8 characters long',
            'string.pattern.name': 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
        }),
    firstName: Joi.string().pattern(/^[A-Za-z]+$/).required().messages({
        'string.pattern.base': 'First name must contain only English letters'
    }),
    lastName: Joi.string().pattern(/^[A-Za-z]+$/).required().messages({
        'string.pattern.base': 'Last name must contain only English letters'
    })
});

const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
});

const renameFileSchema = Joi.object({
    filename: Joi.string().required().trim().min(1).max(255)
});

module.exports = {
    registerSchema,
    loginSchema,
    renameFileSchema
};
