const { refreshAccessToken } = require('../services/refreshTokenService');
const logger = require('../utils/logger');

/**
 * Refresh access token
 */
exports.refreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({ message: 'Refresh token is required' });
        }

        const tokens = await refreshAccessToken(refreshToken);

        res.json({
            success: true,
            data: tokens
        });
    } catch (err) {
        logger.error(`Refresh token error: ${err.message}`);
        res.status(401).json({ message: err.message });
    }
};
