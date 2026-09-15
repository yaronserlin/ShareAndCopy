/**
 * Authentication middleware: verifies the access token — from an
 * `Authorization: Bearer` header if present, falling back to the `token`
 * cookie — and populates `req.currentUser` for downstream handlers. The
 * header takes priority since the client holds its access token in
 * memory and sends it explicitly; the cookie remains a fallback for
 * contexts where it's actually deliverable (same-site/local dev).
 * Supports full user accounts, guest sessions, and a `pairing`-scoped
 * token type that is rejected here (it's only valid for the pairing
 * handshake).
 */

const jwt = require('jsonwebtoken');
const env = require('../config/env');
const responseHandler = require('../utils/responseHandler');
const User = require('../models/User');
const RevokedToken = require('../models/RevokedToken');
const logger = require('../utils/logger');
const { maskEmail } = require('../utils/logSanitize');

/**
 * Verifies the `token` cookie and attaches the authenticated user (or
 * guest identity) to `req.currentUser`, responding with 401 if the
 * token is missing, invalid, revoked, or not a valid session scope.
 */
const auth = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const token = bearerToken || req.cookies?.token;

    if (!token) {
        return responseHandler.error(res, 'No token, authorization denied', null, 401, { code: 'no_token' });
    }

    try {
        const decoded = jwt.verify(token, env.JWT_SECRET);

        if (decoded.scope === 'pairing') {
            return responseHandler.error(res, 'Token is not valid', null, 401, { code: 'token_invalid' });
        }

        req.user = decoded;

        if (decoded.jti) {
            const isRevoked = await RevokedToken.exists({ jti: decoded.jti });
            if (isRevoked) {
                return responseHandler.error(res, 'Token has been revoked', null, 401, { code: 'token_revoked' });
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
            return responseHandler.error(res, 'User not found', null, 401, { code: 'token_invalid' });
        }

        req.currentUser = user;
        logger.debug(`Authenticated user: ${maskEmail(user.email)} (ID: ${user._id})`);
        next();
    } catch (err) {
        logger.warn(`Authentication failed: ${err.message}`);

        // An expired access token is the normal, expected state for a
        // client returning from the background: it just needs to refresh.
        // Saying so explicitly keeps the client from treating it as a
        // dead session and signing the user out.
        if (err instanceof jwt.TokenExpiredError) {
            return responseHandler.error(res, 'Access token expired', null, 401, { code: 'token_expired' });
        }

        responseHandler.error(res, 'Token is not valid', null, 401, { code: 'token_invalid' });
    }
};

module.exports = auth;
