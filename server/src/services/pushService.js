/**
 * Web Push delivery: stores per-device subscriptions and fans out
 * notifications to an account's devices.
 *
 * Push is optional. With no VAPID key pair configured the whole module
 * degrades to a no-op and the API reports `enabled: false`, so the app
 * runs unchanged on a deployment that hasn't set it up.
 */

const webpush = require('web-push');
const env = require('../config/env');
const logger = require('../utils/logger');
const PushSubscription = require('../models/PushSubscription');

const enabled = Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);

if (enabled) {
    webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
    logger.info('Web Push enabled');
} else {
    logger.warn('Web Push disabled: VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY not configured');
}

/** Status codes a push service returns for a subscription that no longer exists. */
const GONE_STATUS_CODES = new Set([404, 410]);

/** @returns {boolean} Whether push delivery is configured. */
const isEnabled = () => enabled;

/** @returns {string|null} The VAPID public key clients subscribe with. */
const getPublicKey = () => env.VAPID_PUBLIC_KEY || null;

/**
 * Stores (or refreshes) a device's subscription.
 *
 * @param {Object} params
 * @param {string} params.userId - Account the subscription belongs to.
 * @param {{endpoint: string, keys: {p256dh: string, auth: string}}} params.subscription
 * @param {string} [params.guestId]
 * @param {string} [params.deviceId]
 * @param {string} [params.deviceName]
 * @param {Object} [params.preferences]
 * @returns {Promise<Object>} The stored subscription document.
 */
const saveSubscription = async ({ userId, subscription, guestId, deviceId, deviceName, preferences }) => {
    const update = {
        userId,
        guestId: guestId || null,
        deviceId: deviceId || null,
        deviceName: deviceName || 'Unknown Device',
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
        lastSeenAt: new Date()
    };

    if (preferences) {
        update.preferences = preferences;
    }

    return PushSubscription.findOneAndUpdate(
        { endpoint: subscription.endpoint },
        { $set: update },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );
};

/**
 * Removes a subscription by endpoint, scoped to its owner so one account
 * can't delete another's.
 *
 * @param {string} userId
 * @param {string} endpoint
 * @returns {Promise<boolean>} Whether a subscription was removed.
 */
const removeSubscription = async (userId, endpoint) => {
    const result = await PushSubscription.deleteOne({ userId, endpoint });
    return result.deletedCount > 0;
};

/**
 * Updates the notification categories a single device wants.
 *
 * @param {string} userId
 * @param {string} endpoint
 * @param {Object} preferences
 * @returns {Promise<Object|null>} The updated document, or `null` if not found.
 */
const updatePreferences = async (userId, endpoint, preferences) => PushSubscription.findOneAndUpdate(
    { userId, endpoint },
    { $set: { preferences, lastSeenAt: new Date() } },
    { new: true }
);

/**
 * Lists an account's subscriptions.
 *
 * @param {string} userId
 * @returns {Promise<Array<Object>>}
 */
const listSubscriptions = async (userId) => PushSubscription.find({ userId })
    .select('endpoint deviceId deviceName preferences createdAt lastSeenAt')
    .lean();

/**
 * Drops every subscription belonging to a device, used when that device
 * is revoked so it stops receiving the account's notifications.
 *
 * @param {string} userId
 * @param {string} deviceId
 * @returns {Promise<number>} How many subscriptions were removed.
 */
const removeDeviceSubscriptions = async (userId, deviceId) => {
    if (!deviceId) return 0;
    const result = await PushSubscription.deleteMany({ userId, deviceId });
    return result.deletedCount || 0;
};

/**
 * Sends a notification to one subscription, pruning it if the push
 * service reports it as gone.
 *
 * @param {Object} subscription - A stored subscription document.
 * @param {Object} payload - The JSON payload handed to the service worker.
 * @returns {Promise<boolean>} Whether delivery succeeded.
 */
const sendToSubscription = async (subscription, payload) => {
    try {
        await webpush.sendNotification(
            {
                endpoint: subscription.endpoint,
                keys: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth }
            },
            JSON.stringify(payload),
            { TTL: payload.ttl || 600, urgency: payload.urgency || 'normal' }
        );
        return true;
    } catch (err) {
        if (GONE_STATUS_CODES.has(err.statusCode)) {
            await PushSubscription.deleteOne({ endpoint: subscription.endpoint });
            logger.info('Pruned expired push subscription');
            return false;
        }

        logger.error(`Push delivery failed (${err.statusCode || 'no status'}): ${err.message}`);
        return false;
    }
};

/**
 * Sends a notification to every device of an account that has opted in
 * to the notification's category.
 *
 * @param {string} userId - The account to notify.
 * @param {Object} notification
 * @param {'transfers'|'pairing'|'devices'|'security'} notification.category
 * @param {string} notification.title
 * @param {string} notification.body
 * @param {string} [notification.tag] - Collapse key: a newer notification replaces an older one with the same tag.
 * @param {string} [notification.url] - Path to open when the notification is clicked.
 * @param {Object} [notification.data] - Extra data passed through to the service worker.
 * @param {Object} [options]
 * @param {string} [options.excludeDeviceId] - Device that triggered the event, which shouldn't be notified about it.
 * @returns {Promise<number>} How many devices were notified.
 */
const sendToUser = async (userId, notification, { excludeDeviceId } = {}) => {
    if (!enabled || !userId) return 0;

    try {
        const query = { userId, [`preferences.${notification.category}`]: true };
        if (excludeDeviceId) {
            query.deviceId = { $ne: excludeDeviceId };
        }

        const subscriptions = await PushSubscription.find(query).lean();
        if (subscriptions.length === 0) return 0;

        const payload = {
            title: notification.title,
            body: notification.body,
            category: notification.category,
            tag: notification.tag || notification.category,
            url: notification.url || '/dashboard',
            data: notification.data || {},
            timestamp: Date.now()
        };

        const results = await Promise.all(subscriptions.map(sub => sendToSubscription(sub, payload)));
        return results.filter(Boolean).length;
    } catch (err) {
        // A notification is never worth failing the action that
        // triggered it, so delivery problems stay contained here.
        logger.error(`Push fan-out failed: ${err.message}`);
        return 0;
    }
};

/**
 * Sends a notification to one specific device of an account - used when
 * an event concerns a single device, such as a file being sent to it.
 *
 * @param {string} userId
 * @param {string} deviceId
 * @param {Object} notification - Same shape as {@link sendToUser}'s.
 * @returns {Promise<number>} How many subscriptions were notified.
 */
const sendToDevice = async (userId, deviceId, notification) => {
    if (!enabled || !userId || !deviceId) return 0;

    try {
        const subscriptions = await PushSubscription.find({
            userId,
            deviceId,
            [`preferences.${notification.category}`]: true
        }).lean();

        if (subscriptions.length === 0) return 0;

        const payload = {
            title: notification.title,
            body: notification.body,
            category: notification.category,
            tag: notification.tag || notification.category,
            url: notification.url || '/dashboard',
            data: notification.data || {},
            timestamp: Date.now()
        };

        const results = await Promise.all(subscriptions.map(sub => sendToSubscription(sub, payload)));
        return results.filter(Boolean).length;
    } catch (err) {
        logger.error(`Push delivery to device failed: ${err.message}`);
        return 0;
    }
};

module.exports = {
    isEnabled,
    getPublicKey,
    saveSubscription,
    removeSubscription,
    updatePreferences,
    listSubscriptions,
    removeDeviceSubscriptions,
    sendToUser,
    sendToDevice
};
