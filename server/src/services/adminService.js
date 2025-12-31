const User = require('../models/User');
const DailyStat = require('../models/DailyStat');

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
    // 1. Total Registered Users
    const userCount = await User.countDocuments();

    // 2. Global Aggregations (from DailyStats)
    const [globalStats] = await DailyStat.aggregate([
        {
            $group: {
                _id: null,
                totalData: { $sum: "$totalDataTransferred" },
                totalGuests: { $sum: "$guestSessions" }
            }
        }
    ]);

    const totalData = globalStats ? globalStats.totalData : 0;
    const totalGuests = globalStats ? globalStats.totalGuests : 0;

    // 3. Top Users by Data Transfer
    const topUsersDocs = await User.aggregate([
        {
            $project: {
                firstName: 1,
                lastName: 1,
                email: 1,
                dataTransferred: 1,
                uploadCount: 1,
                deviceCount: { $size: { $ifNull: ["$authorizedDevices", []] } }
            }
        },
        { $sort: { dataTransferred: -1 } },
        { $limit: 10 }
    ]);

    return {
        users: userCount,
        guests: totalGuests,
        dataTransferred: totalData, // In bytes
        topUsers: topUsersDocs
    };
};
