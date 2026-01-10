const mongoose = require('mongoose');

/**
 * Revoked Token Schema
 * Used to blacklist JWTs before their expiration.
 * @typedef {Object} RevokedToken
 * @property {string} jti - Unique JWT ID
 * @property {Date} expireAt - Automatic deletion time (TTL)
 */
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
        index: { expires: 0 } // MongoDB TTL index: document deletes when this date is reached
    }
});

module.exports = mongoose.model('RevokedToken', RevokedTokenSchema);
