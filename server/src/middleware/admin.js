/**
 * Middleware restricting a route to admin users. Must run after the
 * `auth` middleware, which populates `req.currentUser`.
 */

const responseHandler = require('../utils/responseHandler');
const logger = require('../utils/logger');

/**
 * Calls `next()` if the authenticated user is an admin, otherwise
 * responds with 403.
 */
const isAdmin = (req, res, next) => {
    if (req.currentUser && req.currentUser.isAdmin) {
        logger.debug(`Admin access granted for user ID: ${req.currentUser._id}`);
        next();
    } else {
        logger.warn(`Admin access denied for user ID: ${req.currentUser ? req.currentUser._id : 'unknown'}`);
        responseHandler.error(res, 'Access denied. Admins only.', null, 403);
    }
};

module.exports = isAdmin;
