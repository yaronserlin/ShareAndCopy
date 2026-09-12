/**
 * Controllers for admin-only endpoints.
 */

const adminService = require('../services/adminService');
const logger = require('../utils/logger');
const { maskEmail } = require('../utils/logSanitize');
const responseHandler = require('../utils/responseHandler');

/**
 * GET /admin/stats
 * Returns aggregate usage statistics for the admin dashboard.
 */
exports.getDashboardStats = async (req, res) => {
    try {
        const stats = await adminService.getDashboardStats();
        logger.info(`Admin stats requested by ${maskEmail(req.currentUser.email)}`);
        responseHandler.success(res, stats, 'Dashboard stats retrieved successfully');
    } catch (err) {
        logger.error('Error fetching admin stats', err);
        responseHandler.error(res, 'Failed to fetch admin stats', err);
    }
};
