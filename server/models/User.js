const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    roomId: { type: String, required: true, unique: true },
    usedStorage: { type: Number, default: 0 }
});

module.exports = mongoose.model('User', UserSchema);
