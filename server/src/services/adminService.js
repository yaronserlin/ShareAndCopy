const User = require('../models/User');

/**
 * Service for Admin operations
 * @module services/adminService
 */

/**
 * Get dashboard statistics
 * @async
 * @returns {Promise<Object>} Stats object containing users, files, storage, and topUsers
 */
exports.getDashboardStats = async () => {
    const userCount = await User.countDocuments();

    // Aggregation to count total authorized devices across all users
    const [deviceAgg] = await User.aggregate([
        { $project: { deviceCount: { $size: "$authorizedDevices" } } },
        { $group: { _id: null, totalDevices: { $sum: "$deviceCount" } } }
    ]);

    const deviceCount = deviceAgg ? deviceAgg.totalDevices : 0;

    // Get top 10 users by number of devices
    const topUsersDocs = await User.aggregate([
        {
            $project: {
                firstName: 1,
                lastName: 1,
                email: 1,
                deviceCount: { $size: "$authorizedDevices" }
            }
        },
        { $sort: { deviceCount: -1 } },
        { $limit: 10 }
    ]);

    return {
        users: userCount,
        devices: deviceCount,
        topUsers: topUsersDocs
    };
};
