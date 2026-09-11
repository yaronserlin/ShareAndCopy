/**
 * Refresh-token exchange logic: validates a refresh token and issues a
 * new access/refresh token pair.
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const env = require('../config/env');
const logger = require('../utils/logger');
const User = require('../models/User');

/**
 * Verifies a refresh token and issues a new access/refresh token pair
 * for its subject.
 *
 * @param {string} refreshToken
 * @returns {Promise<{accessToken: string, refreshToken: string}>}
 * @throws {Error} If the token is missing, invalid, expired, of the
 *   wrong type, or its user no longer exists.
 */
exports.refreshAccessToken = async (refreshToken) => {
    try {
        const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET);

        if (decoded.type !== 'refresh') {
            throw new Error('Invalid token type');
        }

        const user = await User.findById(decoded.id).select('isAdmin');
        if (!user) {
            throw new Error('User not found');
        }

        const payload = {
            id: decoded.id,
            isAdmin: user.isAdmin,
            jti: crypto.randomUUID()
        };

        const newAccessToken = jwt.sign(payload, env.JWT_SECRET, { expiresIn: '1h' });
        const newRefreshToken = jwt.sign(
            { id: decoded.id, type: 'refresh' },
            env.JWT_REFRESH_SECRET,
            { expiresIn: '7d' }
        );

        logger.info(`Access token refreshed for user ${decoded.id}`);

        return {
            accessToken: newAccessToken,
            refreshToken: newRefreshToken
        };
    } catch (err) {
        logger.error(`Token refresh failed: ${err.message}`);
        throw new Error('Invalid or expired refresh token');
    }
};
