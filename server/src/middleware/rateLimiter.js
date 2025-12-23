const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');
const env = require('../config/env');

// Define the rate limit message as a constant to avoid duplication and for easier management.
const RATE_LIMIT_MESSAGE = 'Too many requests from this IP, please try again later.';

/**
 * @typedef {import('express').Request} Request
 * @typedef {import('express').Response} Response
 * @typedef {import('express').NextFunction} NextFunction
 */

/**
 * API rate limiter middleware.
 * This middleware limits the number of requests from a single IP address
 * within a specified time window to prevent abuse and ensure fair usage of API resources.
 * Configuration values are sourced from environment variables for flexibility.
 *
 * @module apiLimiter
 * @type {import('express-rate-limit').RateLimitRequestHandler}
 */
const apiLimiter = rateLimit({
    // The duration in milliseconds for which requests are remembered.
    // All requests from a single IP within this window count towards the maximum.
    windowMs: env.RATE_LIMIT_WINDOW_MS,

    // The maximum number of requests allowed from a single IP address
    // within the `windowMs` time frame.
    max: env.RATE_LIMIT_MAX_REQUESTS,

    // The message sent to the client when the rate limit is exceeded.
    message: RATE_LIMIT_MESSAGE,

    /**
     * Custom handler function executed when a client exceeds the rate limit.
     * It logs the event and sends a 429 Too Many Requests response with
     * a user-friendly message and `retryAfter` information.
     * @param {Request} req - The Express request object.
     * @param {Response} res - The Express response object.
     */
    handler: (req, res) => {
        // Log a warning to the server console/logs when an IP address exceeds the rate limit.
        logger.warn(`Rate limit exceeded for IP: ${req.ip} on route: ${req.originalUrl}`);

        // Calculate the time in seconds until the rate limit resets for the client.
        // This value is useful for clients to know when they can retry their requests.
        const retryAfterSeconds = req.rateLimit.resetTime
            ? Math.ceil((req.rateLimit.resetTime.getTime() - Date.now()) / 1000)
            : null;

        // Send a 429 Too Many Requests HTTP status code with a JSON payload.
        // The payload includes success status, the rate limit message, and retry information.
        res.status(429).json({
            success: false,
            message: RATE_LIMIT_MESSAGE,
            retryAfter: retryAfterSeconds
        });
    },

    // Enables the `RateLimit-*` headers (e.g., `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`).
    // This provides clients with detailed information about their current rate limit status.
    standardHeaders: true,

    // Disables the legacy `X-RateLimit-*` headers.
    // `standardHeaders` is preferred for modern APIs.
    legacyHeaders: false,
});

module.exports = apiLimiter;
