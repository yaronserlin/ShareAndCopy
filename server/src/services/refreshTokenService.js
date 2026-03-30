/**
 * Preview: server/src/services/refreshTokenService.js
 * Description: Server business logic service.
 */

const jwt = require('jsonwebtoken');
const env = require('../config/env');
const logger = require('../utils/logger');


exports.refreshAccessToken = async (refreshToken) => {
    try {
        
        const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET);

        if (decoded.type !== 'refresh') {
            throw new Error('Invalid token type');
        }

        
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
