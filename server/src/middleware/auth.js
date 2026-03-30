/**
 * Preview: server/src/middleware/auth.js
 * Description: Express middleware module.
 */

const jwt = require('jsonwebtoken');
const env = require('../config/env');
const responseHandler = require('../utils/responseHandler');
const User = require('../models/User');
const RevokedToken = require('../models/RevokedToken');
const logger = require('../utils/logger');


const auth = async (req, res, next) => {
    const token = req.header('x-auth-token');

    if (!token) {
        return responseHandler.error(res, 'No token, authorization denied', null, 401);
    }

    try {
        const decoded = jwt.verify(token, env.JWT_SECRET);
        req.user = decoded;


        if (decoded.jti) {
            const isRevoked = await RevokedToken.exists({ jti: decoded.jti });
            if (isRevoked) {
                return responseHandler.error(res, 'Token has been revoked', null, 401);
            }
        }


        if (decoded.scope === 'guest' || decoded.isGuest) {
            req.currentUser = {
                _id: decoded.id,
                roomId: decoded.roomId,
                isGuest: true,
                email: 'guest@device',
                firstName: 'Guest',
                lastName: 'Device'
            };
            return next();
        }


        const user = await User.findById(decoded.id).select('-password');
        if (!user) {
            return responseHandler.error(res, 'User not found', null, 401);
        }

        req.currentUser = user;
        logger.debug(`Authenticated user: ${user.email} (ID: ${user._id})`);
        next();
    } catch (err) {
        logger.warn(`Authentication failed: ${err.message}`);
        responseHandler.error(res, 'Token is not valid', null, 401);
    }
};


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

        if (err.name === 'JsonWebTokenError') {
            logger.warn(`Invalid token in optional auth: ${err.message}`);
        } else if (err.name === 'TokenExpiredError') {
            logger.debug(`Expired token in optional auth`);
        } else {
            logger.error(`Unexpected error in optional auth: ${err.message}`);
        }

        next();
    }
};

module.exports = auth;
module.exports.optional = optional;
