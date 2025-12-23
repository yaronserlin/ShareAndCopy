const User = require('../models/User');
const File = require('../models/File');

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
    const fileCount = await File.countDocuments();

    // Aggregate total storage used across all files
    const storageStats = await File.aggregate([
        {
            $group: {
                _id: null,
                totalSize: { $sum: "$size" }
            }
        }
    ]);

    const totalStorage = storageStats.length > 0 ? storageStats[0].totalSize : 0;

    // Get top 10 users by storage usage
    const topUsersDocs = await User.find({})
        .sort({ usedStorage: -1 })
        .limit(10)
        .select('firstName lastName email usedStorage roomId')
        .lean();

    // Populate file count for top users
    const topUsers = await Promise.all(topUsersDocs.map(async (user) => {
        const count = await File.countDocuments({ owner: user._id });
        return { ...user, fileCount: count };
    }));

    return {
        users: userCount,
        files: fileCount,
        storage: totalStorage,
        topUsers
    };
};
