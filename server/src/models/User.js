/**
 * Preview: server/src/models/User.js
 * Description: Mongoose model definition.
 */

const mongoose = require('mongoose');


const UserSchema = new mongoose.Schema({
    authorizedDevices: [{
        deviceId: {
            type: String,
            required: true
        },
        deviceName: {
            type: String,
            default: 'Unknown Device'
        },
        lastActive: {
            type: Date,
            default: Date.now
        },
        jti: {
            type: String,
            required: true,
            validate: {
                validator: function (v) {
                    return v && v.length > 0;
                },
                message: 'JTI cannot be empty'
            }
        }
    }],
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        trim: true,
        lowercase: true,
        index: true
    },
    password: {
        type: String,
        required: [true, 'Password is required']
    },
    firstName: {
        type: String,
        required: [true, 'First name is required'],
        trim: true
    },
    lastName: {
        type: String,
        required: [true, 'Last name is required'],
        trim: true
    },
    roomId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    usedStorage: {
        type: Number,
        default: 0
    },
    dataTransferred: {
        type: Number,
        default: 0
    },
    uploadCount: {
        type: Number,
        default: 0
    },
    downloadCount: {
        type: Number,
        default: 0
    },
    isAdmin: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true 
});



UserSchema.index({ 'authorizedDevices.jti': 1 }); 
UserSchema.index({ 'authorizedDevices.deviceId': 1 }); 

module.exports = mongoose.model('User', UserSchema);
