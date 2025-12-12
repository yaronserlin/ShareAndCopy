const mongoose = require('mongoose');

const FileSchema = new mongoose.Schema({
    filename: { type: String, required: true },
    gridFsId: { type: mongoose.Schema.Types.ObjectId, required: true },

    checksum: { type: String, required: true }, // SHA-256 hash
    size: { type: Number, required: true },
    isPublic: { type: Boolean, default: false },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('File', FileSchema);
