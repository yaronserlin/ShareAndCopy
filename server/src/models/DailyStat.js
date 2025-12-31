const mongoose = require('mongoose');

/**
 * DailyStat Schema
 * Tracks aggregate stats for the entire system per day.
 */
const DailyStatSchema = new mongoose.Schema({
    date: {
        type: String, // Format: YYYY-MM-DD
        required: true,
        unique: true, // One entry per day
        index: true
    },
    totalDataTransferred: {
        type: Number,
        default: 0
    },
    totalUploads: {
        type: Number,
        default: 0
    },
    guestSessions: {
        type: Number,
        default: 0
    },
    activeUsers: {
        type: Number, // Tracking unique active users seen today (optional complexity)
        default: 0
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('DailyStat', DailyStatSchema);
