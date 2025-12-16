const User = require('../models/User');
const File = require('../models/File');
const logger = require('../utils/logger');
const responseHandler = require('../utils/responseHandler');

exports.getDashboardStats = async (req, res) => {
    try {
        const userCount = await User.countDocuments();
        const fileCount = await File.countDocuments();

        const storageStats = await File.aggregate([
            {
                $group: {
                    _id: null,
                    totalSize: { $sum: "$size" }
                }
            }
        ]);

        const totalStorage = storageStats.length > 0 ? storageStats[0].totalSize : 0;

        const topUsersDocs = await User.find({})
            .sort({ usedStorage: -1 })
            .limit(10)
            .select('firstName lastName email usedStorage roomId')
            .lean();

        const topUsers = await Promise.all(topUsersDocs.map(async (user) => {
            const count = await File.countDocuments({ owner: user._id });
            return { ...user, fileCount: count };
        }));

        // Convert bytes to GB for easier reading, or keep bytes and let frontend handle it.
        // Keeping as bytes for precision.

        logger.info(`Admin stats requested by ${req.user.email}`);

        responseHandler.success(res, {
            users: userCount,
            files: fileCount,
            storage: totalStorage,
            topUsers
        }, 'Dashboard stats retrieved successfully');

    } catch (err) {
        logger.error(`Error fetching admin stats: ${err.message}`);
        responseHandler.error(res, 'Failed to fetch admin stats', err);
    }
};
