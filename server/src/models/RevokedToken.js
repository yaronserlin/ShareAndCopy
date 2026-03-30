/**
 * Preview: server/src/models/RevokedToken.js
 * Description: Mongoose model definition.
 */

const mongoose = require('mongoose');


const RevokedTokenSchema = new mongoose.Schema({
    jti: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    reason: {
        type: String,
        default: 'User logged out or device revoked'
    },
    revokedAt: {
        type: Date,
        default: Date.now
    },
    expireAt: {
        type: Date,
        required: true,
        index: { expires: 0 } 
    }
});

module.exports = mongoose.model('RevokedToken', RevokedTokenSchema);
