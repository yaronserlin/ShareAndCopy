/**
 * Denylist of revoked JWT IDs (`jti`), consulted by the auth middleware
 * to reject tokens for logged-out sessions or revoked devices.
 *
 * `expireAt` carries a MongoDB TTL index (`expires: 0`), so documents are
 * automatically deleted once `expireAt` is reached — no manual cleanup
 * job is needed.
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
    /** When this record should be purged; backed by a MongoDB TTL index. */
    expireAt: {
        type: Date,
        required: true,
        index: { expires: 0 }
    }
});

module.exports = mongoose.model('RevokedToken', RevokedTokenSchema);
