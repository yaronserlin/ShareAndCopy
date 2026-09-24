/**
 * Joi validation schemas for the auth and push-notification endpoints.
 */

const Joi = require('joi');
const { APP_CONSTANTS } = require('./constants');

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
    firstName: Joi.string().pattern(APP_CONSTANTS.REGEX.NAME).required().messages({
        'string.pattern.base': 'First name must contain only letters'
    }),
    lastName: Joi.string().pattern(APP_CONSTANTS.REGEX.NAME).required().messages({
        'string.pattern.base': 'Last name must contain only letters'
    }),
    termsAccepted: Joi.boolean().valid(true).required().messages({
        'any.only': 'You must accept the Terms of Service and Privacy Policy',
        'any.required': 'You must accept the Terms of Service and Privacy Policy'
    })
});

/** Schema for `POST /auth/login`. */
const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
    deviceId: Joi.string().pattern(/^[a-zA-Z0-9_-]+$/).optional().messages({
        'string.pattern.base': 'DeviceID contains invalid characters'
    }),
    deviceName: Joi.string().optional()
});

/** Schema for `POST /auth/revoke`. */
const revokeSchema = Joi.object({
    deviceId: Joi.string().pattern(/^[a-zA-Z0-9_-]+$/).required().messages({
        'string.pattern.base': 'DeviceID contains invalid characters',
        'any.required': 'DeviceID is required'
    })
});

/** Notification categories a device can opt in or out of. */
const preferencesSchema = Joi.object({
    transfers: Joi.boolean(),
    pairing: Joi.boolean(),
    devices: Joi.boolean(),
    security: Joi.boolean()
}).min(1);

/** Schema for `POST /push/subscribe`. */
const pushSubscribeSchema = Joi.object({
    subscription: Joi.object({
        endpoint: Joi.string().uri({ scheme: ['https'] }).required().messages({
            'string.uri': 'Push endpoint must be an https URL'
        }),
        expirationTime: Joi.any().optional(),
        keys: Joi.object({
            p256dh: Joi.string().required(),
            auth: Joi.string().required()
        }).required()
    }).required(),
    deviceId: Joi.string().pattern(/^[a-zA-Z0-9_-]+$/).optional().messages({
        'string.pattern.base': 'DeviceID contains invalid characters'
    }),
    deviceName: Joi.string().max(120).optional(),
    preferences: preferencesSchema.optional()
});

/** Schema for `POST /push/unsubscribe`. */
const pushUnsubscribeSchema = Joi.object({
    endpoint: Joi.string().uri({ scheme: ['https'] }).required()
});

/** Schema for `PATCH /push/preferences`. */
const pushPreferencesSchema = Joi.object({
    endpoint: Joi.string().uri({ scheme: ['https'] }).required(),
    preferences: preferencesSchema.required()
});

module.exports = {
    registerSchema,
    loginSchema,
    revokeSchema,
    pushSubscribeSchema,
    pushUnsubscribeSchema,
    pushPreferencesSchema
};
