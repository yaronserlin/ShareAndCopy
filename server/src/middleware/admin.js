/**
 * Preview: server/src/middleware/admin.js
 * Description: Express middleware module.
 */

const responseHandler = require('../utils/responseHandler');
const logger = require('../utils/logger');

const isAdmin = (req, res, next) => {

    if (req.user && req.user.isAdmin) {
        logger.debug(`Admin access granted for user ID: ${req.user.id}`);
        next();
    } else {
        logger.warn(`Admin access denied for user ID: ${req.user ? req.user.id : 'unknown'}`);
        responseHandler.error(res, 'Access denied. Admins only.', null, 403);
    }
};

module.exports = isAdmin;
