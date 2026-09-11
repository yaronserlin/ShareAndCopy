/**
 * Preview: server/src/middleware/admin.js
 * Description: Express middleware module.
 */

const responseHandler = require('../utils/responseHandler');
const logger = require('../utils/logger');

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
