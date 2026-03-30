/**
 * Preview: server/src/models/DailyStat.js
 * Description: Mongoose model definition.
 */

const mongoose = require('mongoose');


const DailyStatSchema = new mongoose.Schema({
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
