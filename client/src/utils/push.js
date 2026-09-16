/**
 * Web Push client: subscribing this device, keeping the server's copy of
 * the subscription in step with the browser's, and letting the user pick
 * which kinds of notification they want.
 *
 * A push subscription belongs to one browser on one device, so all of
 * this is per-device by design: enabling notifications on a phone says
 * nothing about the laptop, which is what people expect.
 *
 * Platform notes worth knowing when reading this:
 *   - Safari on iOS only offers push to an app installed to the home
 *     screen, so the UI has to explain that rather than silently fail.
 *   - The permission prompt must be triggered by a user gesture, which
 *     is why nothing here runs on its own.
 */

import api from './api';
import { getServiceWorkerRegistration, isServiceWorkerSupported, isStandalone } from './pwa';
import { getDeviceId, getDeviceName } from './deviceUtils';

/**
 * Converts the URL-safe base64 VAPID key the server publishes into the
 * byte array `pushManager.subscribe` expects.
 *
 * @param {string} base64String
 * @returns {Uint8Array}
 */
const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = window.atob(base64);

    return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
};

/** @returns {boolean} Whether this browser can receive push notifications at all. */
export const isPushSupported = () => isServiceWorkerSupported() &&
    'PushManager' in window &&
    'Notification' in window;

/** @returns {boolean} Whether this looks like iOS/iPadOS. */
export const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

/**
 * Whether push is unavailable purely because the app is running in a
 * Safari tab rather than as an installed app - a situation worth a
 * different message than "your browser doesn't support this".
 *
 * @returns {boolean}
 */
export const needsInstallForPush = () => isIOS() && !isStandalone();

/** @returns {NotificationPermission|'unsupported'} The current permission state. */
export const getPermission = () => (('Notification' in window) ? Notification.permission : 'unsupported');

/**
 * Reads the server's push configuration (whether it's enabled, and the
 * VAPID public key to subscribe with).
 *
 * @returns {Promise<{enabled: boolean, publicKey: string|null}>}
 */
export const fetchPushConfig = async () => {
    const res = await api.get('/push/config');
    return res.data.data;
};

/**
 * Returns this browser's existing push subscription, if it has one.
 *
 * @returns {Promise<PushSubscription|null>}
 */
export const getExistingSubscription = async () => {
    if (!isPushSupported()) return null;

    const registration = await getServiceWorkerRegistration();
    if (!registration) return null;

    return registration.pushManager.getSubscription();
};

/**
 * Subscribes this device to push notifications: asks for permission,
 * creates the browser subscription, and registers it with the server.
 *
 * Must be called from a user gesture.
 *
 * @param {Object} [options]
 * @param {Object} [options.preferences] - Initial category choices.
 * @param {Object} [options.user] - Current user, used only for the device label.
 * @returns {Promise<{subscription: PushSubscription, preferences: Object}>}
 * @throws {Error} If push is unsupported, not configured, or permission is refused.
 */
export const subscribeToPush = async ({ preferences, user } = {}) => {
    if (!isPushSupported()) {
        throw new Error(needsInstallForPush()
            ? 'Add Share & Copy to your home screen first, then enable notifications from the installed app.'
            : 'This browser does not support notifications.');
    }

    // iOS Safari only honors `requestPermission()` when it's called
    // synchronously within the user gesture that triggered this function
    // (the tap on the toggle) - an `await` on anything else first, like
    // the network round trip below, breaks that association and the
    // prompt silently never appears. So this has to run before any other
    // `await`, even though `fetchPushConfig` reads more naturally first.
    //
    // On an installed iOS PWA this promise can also simply never settle
    // (no dialog appears and neither the resolve nor the OS-level prompt
    // ever fires) rather than resolving 'denied' - a WebKit quirk, not a
    // slow tap. Race it like the calls below so that case surfaces as a
    // recoverable error instead of leaving the toggle disabled forever
    // with isBusy stuck true and no explanation.
    const permission = await Promise.race([
        Notification.requestPermission(),
        new Promise((resolve) => setTimeout(() => resolve('unavailable'), 30000))
    ]);
    if (permission === 'unavailable') {
        throw new Error('The permission prompt did not respond. Check Settings > Notifications > Share & Copy on this device, then try again.');
    }
    if (permission !== 'granted') {
        throw new Error(permission === 'denied'
            ? 'Notifications are blocked for this app in your browser settings.'
            : 'Notification permission was not granted.');
    }

    // The shared API client has no request timeout by design (so a
    // cold-starting backend doesn't cost the user their session), but
    // that means this call has no built-in bound either - race it so a
    // dead connection can't leave this whole flow, and the toggle
    // waiting on it, hung forever with nothing to catch.
    const pushConfig = await Promise.race([
        fetchPushConfig(),
        new Promise((resolve) => setTimeout(() => resolve(null), 15000))
    ]);
    if (!pushConfig) {
        throw new Error('Could not reach the server. Check your connection and try again.');
    }

    const { enabled, publicKey } = pushConfig;
    if (!enabled || !publicKey) {
        throw new Error('Notifications are not configured on this server.');
    }

    // `navigator.serviceWorker.ready` (inside `getServiceWorkerRegistration`)
    // has no built-in timeout: it only resolves once some service worker
    // actually takes control of this page, and simply never settles if
    // that doesn't happen. Racing it against a timeout means a stuck
    // worker surfaces as the same recoverable error below, instead of
    // leaving this call - and the toggle that's waiting on it - hung and
    // disabled with no error and no way to retry.
    const registration = await Promise.race([
        getServiceWorkerRegistration(),
        new Promise((resolve) => setTimeout(() => resolve(null), 10000))
    ]);
    if (!registration) {
        throw new Error('The app is still starting up. Try again in a moment.');
    }

    // Reuse the existing subscription when there is one: re-subscribing
    // with the same key returns the same endpoint anyway, and dropping
    // it first would briefly lose notifications for no reason.
    const existing = await registration.pushManager.getSubscription();
    const subscription = existing || await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
    });

    const res = await api.post('/push/subscribe', {
        subscription: subscription.toJSON(),
        deviceId: getDeviceId(),
        deviceName: getDeviceName(user),
        ...(preferences && { preferences })
    });

    return { subscription, preferences: res.data.data.preferences };
};

/**
 * Unsubscribes this device, both in the browser and on the server.
 *
 * @returns {Promise<void>}
 */
export const unsubscribeFromPush = async () => {
    const subscription = await getExistingSubscription();
    if (!subscription) return;

    const { endpoint } = subscription;

    // Tell the server first: if the browser-side unsubscribe succeeded
    // but the request didn't, the server would keep sending to an
    // endpoint that no longer exists.
    try {
        await api.post('/push/unsubscribe', { endpoint });
    } finally {
        await subscription.unsubscribe();
    }
};

/**
 * Updates which notification categories this device wants.
 *
 * @param {string} endpoint - The subscription's endpoint.
 * @param {Object} preferences
 * @returns {Promise<Object>} The stored preferences.
 */
export const updatePushPreferences = async (endpoint, preferences) => {
    const res = await api.patch('/push/preferences', { endpoint, preferences });
    return res.data.data.preferences;
};

/**
 * Asks the server to send a test notification to this account's devices.
 *
 * @returns {Promise<number>} How many devices it reached.
 */
export const sendTestNotification = async () => {
    const res = await api.post('/push/test');
    return res.data.data.delivered;
};
