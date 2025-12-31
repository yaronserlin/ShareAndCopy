const mongoose = require('mongoose');

/**
 * User Schema
 * @typedef {Object} User
 * @property {string} email - User's email address
 * @property {string} password - Hashed password
 * @property {string} firstName - User's first name
 * @property {string} lastName - User's last name
 * @property {string} roomId - Unique room ID for file sharing
 * @property {number} usedStorage - Storage used in bytes
 * @property {boolean} isAdmin - Admin status
 */
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
    timestamps: true // Adds createdAt and updatedAt
});

module.exports = mongoose.model('User', UserSchema);
