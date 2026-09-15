/**
 * A Web Push subscription belonging to one browser on one device.
 *
 * The endpoint URL the browser's push service hands out is the natural
 * primary key: it is unique per browser/installation and is what
 * `web-push` delivers to. Re-subscribing the same browser produces the
 * same endpoint, so upserting on it keeps one row per device instead of
 * accumulating stale duplicates.
 */

const mongoose = require('mongoose');

/** Which notification categories a device wants to receive. */
const PreferencesSchema = new mongoose.Schema({
    /** Someone is sending this device a file. */
    transfers: { type: Boolean, default: true },
    /** A new device is asking to pair with the account. */
    pairing: { type: Boolean, default: true },
    /** One of the account's other devices came online. */
    devices: { type: Boolean, default: false },
    /** Sign-ins, device revocations and similar account events. */
    security: { type: Boolean, default: true }
}, { _id: false });

const PushSubscriptionSchema = new mongoose.Schema({
    /**
     * The account this subscription delivers for. For a paired guest
     * device this is the host account's ID, since that's the room the
     * guest participates in.
     */
    userId: {
        type: String,
        required: true,
        index: true
    },
    /** Set when the subscriber is a paired guest rather than the account owner. */
    guestId: {
        type: String,
        default: null
    },
    /** The client-generated device ID, so a revoked device's subscription can be dropped. */
    deviceId: {
        type: String,
        default: null,
        index: true
    },
    deviceName: {
        type: String,
        default: 'Unknown Device'
    },
    endpoint: {
        type: String,
        required: true,
        unique: true
    },
    /** The subscription's encryption keys, exactly as the browser supplied them. */
    keys: {
        p256dh: { type: String, required: true },
        auth: { type: String, required: true }
    },
    preferences: {
        type: PreferencesSchema,
        default: () => ({})
    },
    lastSeenAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

module.exports = mongoose.model('PushSubscription', PushSubscriptionSchema);
