const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('./logger');
const responseHandler = require('./responseHandler');

const adminMiddleware = async (req, res, next) => {
    try {
        const token = req.header('x-auth-token');
        if (!token) {
            return responseHandler.error(res, 'No token, authorization denied', null, 401);
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);

        if (!user) {
            return responseHandler.error(res, 'User not found', null, 401);
        }

        if (!user.isAdmin) {
            logger.warn(`Access denied: User ${user.email} is not an admin`);
            return responseHandler.error(res, 'Access denied: Admins only', null, 403);
        }

        req.user = user;
        next();
    } catch (err) {
        logger.error(`Admin middleware error: ${err.message}`);
        responseHandler.error(res, 'Token is not valid', null, 401);
    }
};

module.exports = adminMiddleware;
