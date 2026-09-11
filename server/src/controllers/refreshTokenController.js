/**
 * Preview: server/src/controllers/refreshTokenController.js
 * Description: Server controller handling requests.
 */

const { refreshAccessToken } = require('../services/refreshTokenService');
const logger = require('../utils/logger');
const { setAuthCookies } = require('../utils/cookies');


exports.refreshToken = async (req, res) => {
    try {
        const refreshToken = req.cookies?.refreshToken;

        if (!refreshToken) {
            return res.status(400).json({ message: 'Refresh token is required' });
        }

        const tokens = await refreshAccessToken(refreshToken);

        setAuthCookies(res, { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });

        res.json({ success: true });
    } catch (err) {
        logger.error(`Refresh token error: ${err.message}`);
        res.status(401).json({ message: err.message });
    }
};
