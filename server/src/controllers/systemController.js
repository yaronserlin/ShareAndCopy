const logger = require('../utils/logger');
const systemService = require('../services/systemService');
const responseHandler = require('../utils/responseHandler');
const crypto = require('crypto');
const env = require('../config/env');

/**
 * Controller for System operations
 * @module controllers/systemController
 */

/**
 * Get server's local IP address
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @route GET /api/system/ip
 */
exports.getServerIp = (req, res) => {
    logger.debug('System IP request received');
    try {
        const ip = systemService.getServerIp();

        if (ip) {
            logger.info(`System IP found: ${ip}`);
            responseHandler.success(res, { ip }, 'Local IP found');
        } else {
            logger.warn('System IP request failed: Local IP not found');
            responseHandler.error(res, 'Local IP not found', null, 404);
        }
    } catch (err) {
        responseHandler.error(res, 'Server Error', err);
    }
};

/**
 * Generate ephemeral TURN credentials
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @route GET /api/system/webrtc-config
 */
exports.getWebRTCConfig = (req, res) => {
    try {
        const iceServers = [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
        ];

        if (env.TURN_URL && env.TURN_SECRET) {
            const ttl = 24 * 3600; // 24 hours
            const timestamp = Math.floor(Date.now() / 1000) + ttl;
            const username = `${timestamp}:${env.TURN_USER}`;

            const hmac = crypto.createHmac('sha1', env.TURN_SECRET);
            const password = hmac.update(username).digest('base64');

            iceServers.push({
                urls: env.TURN_URL,
                username: username,
                credential: password
            });
        }

        responseHandler.success(res, { iceServers }, 'WebRTC Config generated');
    } catch (err) {
        logger.error(`Error generating WebRTC config: ${err.message}`);
        responseHandler.error(res, 'Failed to generate WebRTC config', err);
    }
};
