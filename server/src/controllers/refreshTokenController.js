/**
 * Controller for exchanging a refresh token cookie for a new access
 * token.
 */

const { refreshAccessToken } = require('../services/refreshTokenService');
const logger = require('../utils/logger');
const { setAuthCookies } = require('../utils/cookies');

/**
 * POST /auth/refresh-token
 * Issues a new access/refresh token pair from the request's
 * `refreshToken` cookie and sets them as cookies on the response.
 */
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
