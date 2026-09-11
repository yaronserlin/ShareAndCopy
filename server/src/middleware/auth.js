/**
 * Authentication middleware: verifies the access token cookie and
 * populates `req.currentUser` for downstream handlers. Supports full
 * user accounts, guest sessions, and a `pairing`-scoped token type that
 * is rejected here (it's only valid for the pairing handshake).
 */

const jwt = require('jsonwebtoken');
const env = require('../config/env');
const responseHandler = require('../utils/responseHandler');
const User = require('../models/User');
const RevokedToken = require('../models/RevokedToken');
const logger = require('../utils/logger');

/**
 * Verifies the `token` cookie and attaches the authenticated user (or
 * guest identity) to `req.currentUser`, responding with 401 if the
 * token is missing, invalid, revoked, or not a valid session scope.
 */
const auth = async (req, res, next) => {
    const token = req.cookies?.token;

    if (!token) {
        return responseHandler.error(res, 'No token, authorization denied', null, 401);
    }

    try {
        const decoded = jwt.verify(token, env.JWT_SECRET);

        if (decoded.scope === 'pairing') {
            return responseHandler.error(res, 'Token is not valid', null, 401);
        }

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

module.exports = auth;
