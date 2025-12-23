const adminService = require('../services/adminService');
const logger = require('../utils/logger');
const responseHandler = require('../utils/responseHandler');

/**
 * Controller for Admin operations
 * @module controllers/adminController
 */

/**
 * Get Admin Dashboard Stats
 * @async
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @route GET /api/admin/stats
 */
exports.getDashboardStats = async (req, res) => {
    try {
        const stats = await adminService.getDashboardStats();
        logger.info(`Admin stats requested by ${req.user.email}`); // req.user set by auth middleware
        responseHandler.success(res, stats, 'Dashboard stats retrieved successfully');
    } catch (err) {
        logger.error(`Error fetching admin stats: ${err.message}`);
        responseHandler.error(res, 'Failed to fetch admin stats', err);
    }
};
