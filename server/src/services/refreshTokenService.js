const jwt = require('jsonwebtoken');
const env = require('../config/env');
const logger = require('../utils/logger');

/**
 * Refresh access token using a valid refresh token
 * @param {string} refreshToken - Refresh token
 * @returns {object} New access and refresh tokens
 */
exports.refreshAccessToken = async (refreshToken) => {
    try {
        // Verify refresh token
        const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET);

        if (decoded.type !== 'refresh') {
            throw new Error('Invalid token type');
        }

        // Generate new tokens
        const payload = {
            id: decoded.id,
            iat: Math.floor(Date.now() / 1000)
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
