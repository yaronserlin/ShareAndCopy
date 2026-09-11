/**
 * Rate limiting middleware: a general API limiter and a stricter limiter
 * for authentication endpoints.
 */

const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');
const env = require('../config/env');

const RATE_LIMIT_MESSAGE = 'Too many requests from this IP, please try again later.';

/** Builds the 429 response handler shared by both rate limiters. */
const buildHandler = () => (req, res) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip} on route: ${req.originalUrl}`);

    const retryAfterSeconds = req.rateLimit.resetTime
        ? Math.ceil((req.rateLimit.resetTime.getTime() - Date.now()) / 1000)
        : null;

    res.status(429).json({
        success: false,
        message: RATE_LIMIT_MESSAGE,
        retryAfter: retryAfterSeconds
    });
};

/** General API rate limiter, using the configured window/max from env. */
const apiLimiter = rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX_REQUESTS,
    message: RATE_LIMIT_MESSAGE,
    handler: buildHandler(),
    standardHeaders: true,
    legacyHeaders: false,
});

/** Stricter rate limiter for auth endpoints (20 requests / 15 minutes). */
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: RATE_LIMIT_MESSAGE,
    handler: buildHandler(),
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = apiLimiter;
module.exports.apiLimiter = apiLimiter;
module.exports.authLimiter = authLimiter;
