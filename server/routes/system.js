const express = require('express');
const router = express.Router();
const os = require('os');
const logger = require('../utils/logger');
const responseHandler = require('../utils/responseHandler');

// @route   GET api/system/ip
// @desc    Get server's local network IP
// @access  Public
router.get('/ip', (req, res) => {
    logger.debug('System IP request received');
    try {
        const interfaces = os.networkInterfaces();
        let serverIp = null;

        for (const name of Object.keys(interfaces)) {
            for (const iface of interfaces[name]) {
                // Skip internal (i.e. 127.0.0.1) and non-IPv4 addresses
                if ('IPv4' !== iface.family || iface.internal) {
                    continue;
                }
                serverIp = iface.address;
                break;
            }
            if (serverIp) break;
        }

        if (serverIp) {
            logger.info(`System IP found: ${serverIp}`);
            responseHandler.success(res, { ip: serverIp }, 'Local IP found');
        } else {
            logger.warn('System IP request failed: Local IP not found');
            responseHandler.error(res, 'Local IP not found', null, 404);
        }
    } catch (err) {
        logger.error(`System IP Error: ${err.message}`);
        responseHandler.error(res, 'Server Error', err);
    }
});

module.exports = router;
