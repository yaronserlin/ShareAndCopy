/**
 * Controllers for the Web Push endpoints: advertising the VAPID public
 * key, registering a device's subscription, updating which notification
 * categories it wants, and sending a test notification.
 */

const pushService = require('../services/pushService');
const responseHandler = require('../utils/responseHandler');
const logger = require('../utils/logger');

/**
 * Resolves the account a request's session delivers notifications for.
 * A paired guest has no account of its own, so its notifications belong
 * to the host account whose room it joined.
 *
 * @param {import('express').Request} req
 * @returns {{userId: string, guestId: string|null}}
 */
const subscriberIdentity = (req) => {
    if (req.currentUser.isGuest) {
        return {
            userId: String(req.currentUser.roomId),
            guestId: String(req.currentUser._id)
        };
    }

    return { userId: String(req.currentUser._id), guestId: null };
};

/**
 * GET /push/config
 * Reports whether push is available on this deployment and, if so, the
 * VAPID public key the client needs in order to subscribe.
 */
exports.getConfig = (req, res) => {
    responseHandler.success(res, {
        enabled: pushService.isEnabled(),
        publicKey: pushService.getPublicKey()
    }, 'Push configuration retrieved');
};

/**
 * POST /push/subscribe
 * Registers (or refreshes) this device's push subscription.
 */
exports.subscribe = async (req, res) => {
    if (!pushService.isEnabled()) {
        return responseHandler.error(res, 'Push notifications are not configured on this server', null, 503);
    }

    const { subscription, deviceId, deviceName, preferences } = req.body;
    const { userId, guestId } = subscriberIdentity(req);

    try {
        const saved = await pushService.saveSubscription({
            userId,
            guestId,
            subscription,
            deviceId,
            deviceName,
            preferences
        });

        logger.info(`Push subscription registered for device ${deviceId || 'unknown'}`);

        responseHandler.success(res, {
            endpoint: saved.endpoint,
            preferences: saved.preferences
        }, 'Push subscription saved', 201);
    } catch (err) {
        logger.error('Failed to save push subscription', err);
        responseHandler.error(res, 'Failed to save push subscription', err.message);
    }
};

/**
 * POST /push/unsubscribe
 * Removes this device's push subscription.
 */
exports.unsubscribe = async (req, res) => {
    const { userId } = subscriberIdentity(req);

    try {
        const removed = await pushService.removeSubscription(userId, req.body.endpoint);
        responseHandler.success(res, { removed }, removed ? 'Push subscription removed' : 'No matching subscription');
    } catch (err) {
        logger.error('Failed to remove push subscription', err);
        responseHandler.error(res, 'Failed to remove push subscription', err.message);
    }
};

/**
 * PATCH /push/preferences
 * Updates which notification categories this device wants.
 */
exports.updatePreferences = async (req, res) => {
    const { userId } = subscriberIdentity(req);
    const { endpoint, preferences } = req.body;

    try {
        const updated = await pushService.updatePreferences(userId, endpoint, preferences);

        if (!updated) {
            return responseHandler.error(res, 'Subscription not found', null, 404);
        }

        responseHandler.success(res, { preferences: updated.preferences }, 'Preferences updated');
    } catch (err) {
        logger.error('Failed to update push preferences', err);
        responseHandler.error(res, 'Failed to update preferences', err.message);
    }
};

/**
 * GET /push/subscriptions
 * Lists the account's subscribed devices, so the user can see which
 * devices will be notified.
 */
exports.listSubscriptions = async (req, res) => {
    const { userId } = subscriberIdentity(req);

    try {
        const subscriptions = await pushService.listSubscriptions(userId);
        responseHandler.success(res, { subscriptions }, 'Subscriptions retrieved');
    } catch (err) {
        logger.error('Failed to list push subscriptions', err);
        responseHandler.error(res, 'Failed to list subscriptions', err.message);
    }
};

/**
 * POST /push/test
 * Sends a test notification to the account's subscribed devices, so the
 * user can confirm the whole chain works from the settings screen.
 */
exports.sendTest = async (req, res) => {
    if (!pushService.isEnabled()) {
        return responseHandler.error(res, 'Push notifications are not configured on this server', null, 503);
    }

    const { userId } = subscriberIdentity(req);

    try {
        const delivered = await pushService.sendToUser(userId, {
            category: 'security',
            title: 'Share & Copy',
            body: 'Test notification - notifications are working on this device.',
            tag: 'push-test',
            url: '/dashboard'
        });

        responseHandler.success(res, { delivered }, delivered > 0
            ? 'Test notification sent'
            : 'No subscribed device is currently accepting this category');
    } catch (err) {
        logger.error('Failed to send test notification', err);
        responseHandler.error(res, 'Failed to send test notification', err.message);
    }
};
