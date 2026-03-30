/**
 * Preview: server/src/services/adminService.js
 * Description: Server business logic service.
 */

const User = require('../models/User');
const DailyStat = require('../models/DailyStat');




exports.getDashboardStats = async () => {
    
    const userCount = await User.countDocuments();

    
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
        dataTransferred: totalData, 
        topUsers: topUsersDocs
    };
};
