/**
 * Controller for exchanging a refresh token for a fresh access/refresh
 * pair.
 */

const { refreshAccessToken } = require('../services/refreshTokenService');
const logger = require('../utils/logger');
const { setAuthCookies } = require('../utils/cookies');

/**
 * POST /auth/refresh
 * Issues a new access/refresh token pair from the request's
 * `refreshToken` cookie or body and sets them as cookies on the
 * response.
 *
 * The status code is the contract the client leans on: 401 means the
 * session is genuinely over and local tokens should be discarded, while
 * 503 means "couldn't check right now, keep the session and retry". A
 * transient failure answered with 401 is exactly what used to sign
 * people out of the installed app for no reason.
 */
exports.refreshToken = async (req, res) => {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!refreshToken) {
        return res.status(400).json({ success: false, message: 'Refresh token is required' });
    }

    try {
        const tokens = await refreshAccessToken(refreshToken);

        setAuthCookies(res, { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });

        res.json({
            success: true,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            isGuest: tokens.isGuest || false
        });
    } catch (err) {
        if (err.code === 'unavailable') {
            logger.error(`Refresh temporarily unavailable: ${err.message}`);
            return res.status(503).json({ success: false, message: err.message, retryable: true });
        }

        logger.warn(`Refresh token rejected: ${err.message}`);
        res.status(401).json({ success: false, message: err.message, retryable: false });
    }
};
