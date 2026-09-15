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

    /**
     * Access token lifetime. Short by design: the client refreshes it
     * transparently, and a stolen access token stays useful only briefly.
     */
    ACCESS_TOKEN_TTL: process.env.ACCESS_TOKEN_TTL || '1h',

    /**
     * Refresh token lifetime, i.e. how long a device stays signed in
     * without re-entering credentials. Long by design: an installed PWA
     * is expected to stay signed in the way a native app does, and every
     * refresh rotates the token.
     */
    REFRESH_TOKEN_TTL: process.env.REFRESH_TOKEN_TTL || '30d',

    /** Refresh token lifetime for paired guest devices. */
    GUEST_REFRESH_TOKEN_TTL: process.env.GUEST_REFRESH_TOKEN_TTL || '7d',

    /**
     * VAPID key pair and contact address for Web Push. Push is simply
     * disabled (endpoints report `enabled: false`) when these are unset,
     * so the app runs fine without them. Generate a pair with
     * `npm run generate-vapid`.
     */
    VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY,
    VAPID_SUBJECT: process.env.VAPID_SUBJECT || 'mailto:admin@shareandcopy.app',

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
