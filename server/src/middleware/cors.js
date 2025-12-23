const cors = require('cors');
const logger = require('../utils/logger');
const env = require('../config/env');

/**
 * Pre-compiled regexes for local development environments.
 * Matches http/https on localhost or 127.0.0.1 with any port.
 */
const LOCAL_ORIGINS = [
    /^https?:\/\/localhost(:\d+)?$/,
    /^https?:\/\/127\.0\.0\.1(:\d+)?$/,
    // Webpack/Vite on local network (e.g., 192.168.x.x, 172.20.10.x)
    /^https?:\/\/(10|172\.(1[6-9]|2\d|3[01])|192\.168)\.\d+\.\d+(:\d+)?$/
];

/**
 * Builds the list of allowed origin regexes.
 * Includes local dev patterns and the configured PUBLIC_URL.
 * 
 * @returns {RegExp[]} Array of allowed origin regular expressions
 */
const getAllowedOrigins = () => {
    const origins = [...LOCAL_ORIGINS];
    if (env.PUBLIC_URL) {
        // Escape special regex characters in the public URL string
        const safeUrl = env.PUBLIC_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Allow the exact public URL, optionally followed by a port or sub-path logic if needed (here matching port logic)
        origins.push(new RegExp(`^${safeUrl}(/.*)?(/.*)?(/.*)?$`));
    }
    return origins;
};

// Cache the allowed origins so we don't rebuild the array and regexes on every request
const allowedOrigins = getAllowedOrigins();

/**
 * CORS configuration options.
 * Defines the policy for cross-origin resource sharing.
 */
const corsOptions = {
    /**
     * Dynamic origin handler to check incoming requests against allowed domains.
     * 
     * @param {string} origin - The Origin header of the request
     * @param {function} callback - Express-style callback (err, allow)
     */
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps, curl requests, or same-origin)
        if (!origin) return callback(null, true);

        // Check if the incoming origin matches any of our allowed patterns
        const isAllowed = allowedOrigins.some(regex => regex.test(origin));

        if (isAllowed) {
            callback(null, true);
        } else {
            logger.warn(`Blocked by CORS: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization", "Access-Control-Allow-Origin", "x-auth-token"],
    exposedHeaders: ["x-iv"]
};

module.exports = cors(corsOptions);
