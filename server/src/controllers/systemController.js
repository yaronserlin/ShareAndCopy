const logger = require('../utils/logger');
const systemService = require('../services/systemService');
const responseHandler = require('../utils/responseHandler');

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
