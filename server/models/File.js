const mongoose = require('mongoose');

const FileSchema = new mongoose.Schema({
    filename: { type: String, required: true },
    gridFsId: { type: mongoose.Schema.Types.ObjectId, required: true },

    checksum: { type: String, required: true, index: true }, // SHA-256 hash
    size: { type: Number, required: true },
    isPublic: { type: Boolean, default: false },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    createdAt: { type: Date, default: Date.now, index: true },
});

// Compound index for frequent queries: "Get all files for this user, sorted by date"
FileSchema.index({ owner: 1, createdAt: -1 });

module.exports = mongoose.model('File', FileSchema);
