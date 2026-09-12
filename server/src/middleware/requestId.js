/**
 * Assigns a correlation ID to every request, so its log lines can be
 * tied together. Reuses a caller-supplied `X-Request-Id` if it looks
 * safe, otherwise mints a fresh one.
 */

const crypto = require('crypto');
const logger = require('../utils/logger');

const SAFE_ID = /^[\w-]{1,100}$/;

/**
 * Sets `req.id`, echoes it back as `X-Request-Id`, and attaches
 * `req.log`, a child logger that includes `requestId` on every entry.
 */
const requestId = (req, res, next) => {
    const incoming = req.headers['x-request-id'];
    req.id = (typeof incoming === 'string' && SAFE_ID.test(incoming))
        ? incoming
        : crypto.randomUUID();

    res.setHeader('X-Request-Id', req.id);
    req.log = logger.child({ requestId: req.id });

    next();
};

module.exports = requestId;
