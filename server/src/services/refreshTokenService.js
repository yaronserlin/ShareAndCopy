/**
 * Refresh-token exchange logic: validates a refresh token and issues a
 * new access/refresh token pair, for both full accounts and paired guest
 * sessions.
 *
 * Failures are classified rather than collapsed into one generic error.
 * The client treats an `invalid_token` as "this session is over, sign in
 * again" and anything else as "try again later" - so a database hiccup
 * or a cold-started server no longer costs the user their session.
 */

const jwt = require('jsonwebtoken');
const tokenService = require('./tokenService');
const logger = require('../utils/logger');
const User = require('../models/User');

/**
 * A refresh failure carrying a machine-readable reason.
 *
 * `code` is `'invalid_token'` when the token itself is definitively no
 * good (malformed, expired, wrong type, revoked device, deleted user),
 * and `'unavailable'` when the token may well be fine but the server
 * couldn't check it right now.
 */
class RefreshTokenError extends Error {
    /**
     * @param {string} message
     * @param {'invalid_token'|'unavailable'} code
     */
    constructor(message, code) {
        super(message);
        this.name = 'RefreshTokenError';
        this.code = code;
    }
}

/** Refresh-token failures from `jsonwebtoken` that mean the token is genuinely bad. */
const isTokenFormatError = (err) => err instanceof jwt.JsonWebTokenError ||
    err instanceof jwt.TokenExpiredError ||
    err instanceof jwt.NotBeforeError;

/**
 * Issues a new pair for a paired guest device. The guest itself has no
 * user record - it borrows the host account's room - so the host is what
 * gets checked: it must still exist, and must not have revoked this
 * device.
 *
 * @param {Object} decoded - The verified guest refresh token payload.
 * @returns {Promise<{accessToken: string, refreshToken: string, isGuest: true}>}
 */
const refreshGuestSession = async (decoded) => {
    const host = await User.findById(decoded.roomId).select('revokedDevices').lean();

    if (!host) {
        throw new RefreshTokenError('Host account no longer exists', 'invalid_token');
    }

    if (decoded.deviceId && host.revokedDevices?.some(d => d.deviceId === decoded.deviceId)) {
        throw new RefreshTokenError('Device revoked', 'invalid_token');
    }

    const { token: accessToken } = tokenService.signGuestAccessToken({
        guestId: decoded.id,
        roomId: decoded.roomId,
        name: decoded.name
    });

    const refreshToken = tokenService.signGuestRefreshToken({
        guestId: decoded.id,
        roomId: decoded.roomId,
        name: decoded.name,
        deviceId: decoded.deviceId
    });

    return { accessToken, refreshToken, isGuest: true };
};

/**
 * Verifies a refresh token and issues a new access/refresh token pair
 * for its subject.
 *
 * @param {string} refreshToken
 * @returns {Promise<{accessToken: string, refreshToken: string, isGuest?: boolean}>}
 * @throws {RefreshTokenError}
 */
exports.refreshAccessToken = async (refreshToken) => {
    let decoded;

    try {
        decoded = tokenService.verifyRefreshToken(refreshToken);
    } catch (err) {
        logger.warn(`Token refresh rejected: ${err.message}`);
        throw new RefreshTokenError('Invalid or expired refresh token', 'invalid_token');
    }

    if (decoded.type !== 'refresh') {
        throw new RefreshTokenError('Invalid token type', 'invalid_token');
    }

    try {
        if (decoded.scope === 'guest' || decoded.isGuest) {
            return await refreshGuestSession(decoded);
        }

        const user = await User.findById(decoded.id).select('isAdmin revokedDevices authorizedDevices');
        if (!user) {
            throw new RefreshTokenError('User not found', 'invalid_token');
        }

        if (decoded.deviceId && user.revokedDevices?.some(d => d.deviceId === decoded.deviceId)) {
            throw new RefreshTokenError('Device revoked', 'invalid_token');
        }

        const { token: newAccessToken, jti } = tokenService.signAccessToken({
            userId: decoded.id,
            isAdmin: user.isAdmin
        });

        const newRefreshToken = tokenService.signRefreshToken({
            userId: decoded.id,
            deviceId: decoded.deviceId
        });

        if (decoded.deviceId) {
            const deviceIndex = user.authorizedDevices.findIndex(d => d.deviceId === decoded.deviceId);
            if (deviceIndex > -1) {
                user.authorizedDevices[deviceIndex].jti = jti;
                user.authorizedDevices[deviceIndex].lastActive = new Date();
                await user.save();
            }
        }

        logger.info(`Access token refreshed for user ${decoded.id}`);

        return {
            accessToken: newAccessToken,
            refreshToken: newRefreshToken
        };
    } catch (err) {
        if (err instanceof RefreshTokenError) {
            throw err;
        }

        if (isTokenFormatError(err)) {
            throw new RefreshTokenError('Invalid or expired refresh token', 'invalid_token');
        }

        // Anything else (database unreachable, a cold-started instance
        // still connecting) is temporary: report it as such so the
        // client retries instead of discarding a valid session.
        logger.error(`Token refresh failed for an unrelated reason: ${err.message}`);
        throw new RefreshTokenError('Unable to refresh session right now', 'unavailable');
    }
};

exports.RefreshTokenError = RefreshTokenError;
