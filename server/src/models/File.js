const mongoose = require('mongoose');

/**
 * File Schema
 * @typedef {Object} File
 * @property {string} filename - Name of the file
 * @property {ObjectId} gridFsId - Reference to GridFS file
 * @property {string} checksum - SHA-256 hash for integrity
 * @property {number} size - File size in bytes
 * @property {boolean} isPublic - Visibility status
 * @property {ObjectId} owner - Reference to User model
 */
const FileSchema = new mongoose.Schema({
    filename: {
        type: String,
        required: [true, 'Filename is required'],
        trim: true
    },
    gridFsId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    checksum: {
        type: String,
        required: true,
        index: true
    },
    size: {
        type: Number,
        required: true
    },
    isPublic: {
        type: Boolean,
        default: false
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    }
}, {
    timestamps: true
});

// Compound index for frequent queries: "Get all files for this user, sorted by date"
FileSchema.index({ owner: 1, createdAt: -1 });

module.exports = mongoose.model('File', FileSchema);
