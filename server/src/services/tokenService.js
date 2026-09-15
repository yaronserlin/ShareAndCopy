/**
 * Single source of truth for issuing and verifying the JWTs used across
 * the app: full-account access/refresh pairs, and the guest pairs handed
 * to devices that joined via a pairing code.
 *
 * Every session type gets a refresh token. Guest sessions used to get an
 * access token only, which meant a paired device lost its session the
 * moment the page was reloaded (the access token lives in memory
 * client-side, and the cookie fallback is cross-site and routinely
 * dropped by the browser). Installed PWAs reload constantly - the OS
 * discards the web view whenever the app sits in the background - so a
 * session that can't survive a reload is a session that ends "after a
 * few minutes".
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const env = require('../config/env');

/**
 * Secret for refresh tokens. Falls back to a derived value so a
 * deployment that only sets `JWT_SECRET` still issues usable refresh
 * tokens instead of failing every login; the two secrets stay distinct
 * either way.
 */
const refreshSecret = () => env.JWT_REFRESH_SECRET || `${env.JWT_SECRET}:refresh`;

/** @returns {string} A fresh token ID, used for revocation lookups. */
const newJti = () => crypto.randomUUID();

/**
 * Issues an access token for a full user account.
 *
 * @param {{userId: string, isAdmin?: boolean, jti?: string}} params
 * @returns {{token: string, jti: string}}
 */
const signAccessToken = ({ userId, isAdmin = false, jti = newJti() }) => ({
    token: jwt.sign({ id: userId, isAdmin, jti }, env.JWT_SECRET, { expiresIn: env.ACCESS_TOKEN_TTL }),
    jti
});

/**
 * Issues a refresh token for a full user account, optionally bound to
 * the device it was issued to so device revocation can invalidate it.
 *
 * @param {{userId: string, deviceId?: string}} params
 * @returns {string}
 */
const signRefreshToken = ({ userId, deviceId }) => jwt.sign(
    { id: userId, type: 'refresh', ...(deviceId && { deviceId }) },
    refreshSecret(),
    { expiresIn: env.REFRESH_TOKEN_TTL }
);

/**
 * Issues an access token for a paired guest device. `roomId` is the
 * host account's ID: the guest acts inside that account's room without
 * being a user of its own.
 *
 * @param {{guestId: string, roomId: string, name?: string, jti?: string}} params
 * @returns {{token: string, jti: string}}
 */
const signGuestAccessToken = ({ guestId, roomId, name = 'Guest Device', jti = newJti() }) => ({
    token: jwt.sign(
        { id: guestId, roomId, isGuest: true, scope: 'guest', name, jti },
        env.JWT_SECRET,
        { expiresIn: env.ACCESS_TOKEN_TTL }
    ),
    jti
});

/**
 * Issues a refresh token for a paired guest device, so the guest session
 * survives a reload the same way an account session does.
 *
 * @param {{guestId: string, roomId: string, name?: string, deviceId?: string}} params
 * @returns {string}
 */
const signGuestRefreshToken = ({ guestId, roomId, name = 'Guest Device', deviceId }) => jwt.sign(
    { id: guestId, roomId, type: 'refresh', scope: 'guest', name, ...(deviceId && { deviceId }) },
    refreshSecret(),
    { expiresIn: env.GUEST_REFRESH_TOKEN_TTL }
);

/**
 * Verifies a refresh token.
 *
 * @param {string} token
 * @returns {Object} The decoded payload.
 * @throws {jwt.JsonWebTokenError} If the token is invalid or expired.
 */
const verifyRefreshToken = (token) => jwt.verify(token, refreshSecret());

module.exports = {
    newJti,
    signAccessToken,
    signRefreshToken,
    signGuestAccessToken,
    signGuestRefreshToken,
    verifyRefreshToken,
    refreshSecret
};
