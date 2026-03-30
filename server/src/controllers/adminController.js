/**
 * Preview: server/src/controllers/adminController.js
 * Description: Server controller handling requests.
 */

const adminService = require('../services/adminService');
const logger = require('../utils/logger');
const responseHandler = require('../utils/responseHandler');




exports.getDashboardStats = async (req, res) => {
    try {
        const stats = await adminService.getDashboardStats();
        logger.info(`Admin stats requested by ${req.user.email}`); 
        responseHandler.success(res, stats, 'Dashboard stats retrieved successfully');
    } catch (err) {
        logger.error(`Error fetching admin stats: ${err.message}`);
        responseHandler.error(res, 'Failed to fetch admin stats', err);
    }
};
