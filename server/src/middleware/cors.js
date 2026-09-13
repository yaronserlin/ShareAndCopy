/**
 * CORS configuration allowing local/LAN origins (for same-network device
 * pairing) plus the configured public URL.
 */

const cors = require('cors');
const logger = require('../utils/logger');
const env = require('../config/env');

/** Origins always allowed: localhost and private LAN IP ranges. */
const LOCAL_ORIGINS = [
    /^https?:\/\/localhost(:\d+)?$/,
    /^https?:\/\/127\.0\.0\.1(:\d+)?$/,
    /^https?:\/\/(10|172\.(1[6-9]|2\d|3[01])|192\.168)\.\d+\.\d+(:\d+)?$/
];

/**
 * Builds the full list of allowed-origin patterns: the local/LAN
 * patterns plus a pattern derived from `env.PUBLIC_URL`, if set.
 *
 * @returns {Array<RegExp>}
 */
const getAllowedOrigins = () => {
    const origins = [...LOCAL_ORIGINS];

    // `env.PUBLIC_URL` defaults to the sentinel `'*'` when unset (see
    // config/env.js). Unlike Helmet's CSP, a wildcard has no meaning for
    // this origin-matching regex, so we deliberately skip building a
    // pattern from it rather than relying on it regex-escaping into a
    // literal `\*` that coincidentally never matches a real Origin header.
    if (env.PUBLIC_URL && env.PUBLIC_URL !== '*') {
        const safeUrl = env.PUBLIC_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        origins.push(new RegExp(`^${safeUrl}(/.*)?(/.*)?(/.*)?$`));
    }
    return origins;
};

const allowedOrigins = getAllowedOrigins();

const corsOptions = {
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);

        const isAllowed = allowedOrigins.some(regex => regex.test(origin));

        if (isAllowed) {
            callback(null, true);
        } else {
            logger.warn(`Blocked by CORS: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["x-iv"]
};

module.exports = cors(corsOptions);
module.exports.getAllowedOrigins = getAllowedOrigins;
