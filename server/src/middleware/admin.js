const responseHandler = require('../utils/responseHandler');

/**
 * Middleware to check if user is admin
 * Assumes 'auth' middleware has already run and attached req.user
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Next middleware
 */
const isAdmin = (req, res, next) => {
    // req.user is payload from token { id, isAdmin }
    // req.currentUser is full model from DB (optional in auth middleware)

    // We can rely on token payload if trusted, or check DB payload
    if (req.user && req.user.isAdmin) {
        next();
    } else {
        responseHandler.error(res, 'Access denied. Admins only.', null, 403);
    }
};

module.exports = isAdmin;
