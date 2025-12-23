const jwt = require('jsonwebtoken');
const env = require('../config/env');
const responseHandler = require('../utils/responseHandler');
const User = require('../models/User');

/**
 * Middleware to verify JWT token
 */
const auth = async (req, res, next) => {
    const token = req.header('x-auth-token');

    if (!token) {
        return responseHandler.error(res, 'No token, authorization denied', null, 401);
    }

    try {
        const decoded = jwt.verify(token, env.JWT_SECRET);
        req.user = decoded; // Add user payload to request

        // Optional: Check if user still exists in DB
        const user = await User.findById(decoded.id).select('-password');
        if (!user) {
            return responseHandler.error(res, 'User not found', null, 401);
        }

        req.currentUser = user; // Add full user object to request
        next();
    } catch (err) {
        responseHandler.error(res, 'Token is not valid', null, 401);
    }
};

/**
 * Middleware for optional authentication
 * Does not error if token is missing
 */
const optional = async (req, res, next) => {
    const token = req.header('x-auth-token');

    if (!token) {
        return next();
    }

    try {
        const decoded = jwt.verify(token, env.JWT_SECRET);
        req.user = decoded;
        const user = await User.findById(decoded.id).select('-password');
        if (user) {
            req.currentUser = user;
        }
        next();
    } catch (err) {
        // invalid token, just proceed as guest
        next();
    }
};

module.exports = auth;
module.exports.optional = optional;
