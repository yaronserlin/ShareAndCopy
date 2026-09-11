/**
 * Loads and validates environment variables, throwing at startup if a
 * required variable is missing, and exports typed defaults for the rest
 * of the server.
 */

const dotenv = require('dotenv');

dotenv.config();

const requiredEnvVars = [
    'MONGO_URI',
    'JWT_SECRET'
];

if (process.env.TURN_URL) {
    requiredEnvVars.push('TURN_SECRET');
}

const missingVars = requiredEnvVars.filter(key => !process.env[key]);
if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
}

module.exports = {
    /** HTTP port the server listens on. */
    PORT: process.env.PORT || 5000,

    /** MongoDB connection string. */
    MONGO_URI: process.env.MONGO_URI,

    /** Secret used to sign access tokens. */
    JWT_SECRET: process.env.JWT_SECRET,

    /** Secret used to sign refresh tokens. */
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,

    /** Rate limiter window size, in ms. */
    RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60000,

    /** Maximum requests allowed per rate limiter window. */
    RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,

    /** Allowed CORS origin. */
    PUBLIC_URL: process.env.PUBLIC_URL || '*',

    /** Current runtime environment. */
    NODE_ENV: process.env.NODE_ENV || 'development',

    /** Shared secret, TURN server URL, and username for TURN credential generation. */
    TURN_SECRET: process.env.TURN_SECRET,
    TURN_URL: process.env.TURN_URL,
    TURN_USER: process.env.TURN_USER || 'user',

    /** Bearer token required to access the metrics endpoint. */
    METRICS_TOKEN: process.env.METRICS_TOKEN,
};
