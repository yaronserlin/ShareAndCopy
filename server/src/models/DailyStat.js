/**
 * One document per calendar day (`date` as `YYYY-MM-DD`), aggregating
 * system-wide usage for the admin dashboard's history charts.
 */

const mongoose = require('mongoose');

const DailyStatSchema = new mongoose.Schema({
    /** Calendar day this document summarizes, as `YYYY-MM-DD`. */
    date: {
        type: String,
        required: true,
        unique: true,
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
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('DailyStat', DailyStatSchema);
