/**
 * Hook backing the notification settings UI: reports what this device
 * and this server can do, and turns push notifications on or off for
 * this device.
 *
 * Everything is per-device, matching how push subscriptions actually
 * work - the phone and the laptop each make their own choice.
 */

import { useCallback, useEffect, useState } from 'react';
import api from '../utils/api';
import {
    fetchPushConfig,
    getExistingSubscription,
    getPermission,
    isPushSupported,
    needsInstallForPush,
    sendTestNotification,
    subscribeToPush,
    unsubscribeFromPush,
    updatePushPreferences
} from '../utils/push';

/** The categories offered in the UI, in display order. */
export const NOTIFICATION_CATEGORIES = [
    {
        key: 'transfers',
        label: 'Incoming files',
        description: 'When another of your devices starts sending you a file.'
    },
    {
        key: 'pairing',
        label: 'Pairing requests',
        description: 'When a new device asks to join your account.'
    },
    {
        key: 'security',
        label: 'Account activity',
        description: 'New sign-ins and devices removed from your account.'
    },
    {
        key: 'devices',
        label: 'Devices coming online',
        description: 'When one of your other devices becomes available.'
    }
];

/** Defaults for a device that has just subscribed. */
const DEFAULT_PREFERENCES = {
    transfers: true,
    pairing: true,
    security: true,
    devices: false
};

/**
 * @param {Object} [user] - The current user, used for the device label.
 * @returns {Object} Notification state and the actions that change it.
 */
export const useNotifications = (user) => {
    const [supported] = useState(() => isPushSupported());
    const [requiresInstall] = useState(() => needsInstallForPush());
    const [serverEnabled, setServerEnabled] = useState(null);
    const [permission, setPermission] = useState(() => getPermission());
    const [subscription, setSubscription] = useState(null);
    const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
    const [isBusy, setIsBusy] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            try {
                const config = await fetchPushConfig();
                if (cancelled) return;
                setServerEnabled(config.enabled);

                if (!config.enabled || !isPushSupported()) return;

                const existing = await getExistingSubscription();
                if (cancelled || !existing) return;

                setSubscription(existing);

                // Pull this device's stored categories, so the switches
                // reflect what the server will actually send.
                const res = await api.get('/push/subscriptions');
                const match = res.data.data.subscriptions.find((s) => s.endpoint === existing.endpoint);

                if (!cancelled && match?.preferences) {
                    setPreferences({ ...DEFAULT_PREFERENCES, ...match.preferences });
                }
            } catch (err) {
                if (!cancelled) {
                    console.warn('Could not load notification settings', err.message);
                }
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        };

        load();

        return () => {
            cancelled = true;
        };
    }, []);

    /** Turns notifications on for this device. */
    const enable = useCallback(async () => {
        setIsBusy(true);
        setError(null);

        try {
            const result = await subscribeToPush({ preferences, user });
            setSubscription(result.subscription);
            setPreferences({ ...DEFAULT_PREFERENCES, ...result.preferences });
            setPermission(getPermission());
            return true;
        } catch (err) {
            setError(err.message);
            setPermission(getPermission());
            return false;
        } finally {
            setIsBusy(false);
        }
    }, [preferences, user]);

    /** Turns notifications off for this device. */
    const disable = useCallback(async () => {
        setIsBusy(true);
        setError(null);

        try {
            await unsubscribeFromPush();
            setSubscription(null);
            return true;
        } catch (err) {
            setError(err.message);
            return false;
        } finally {
            setIsBusy(false);
        }
    }, []);

    /**
     * Toggles one category for this device, updating the UI immediately
     * and rolling back if the server rejects the change.
     *
     * @param {string} key
     * @param {boolean} value
     */
    const setCategory = useCallback(async (key, value) => {
        const previous = preferences;
        const next = { ...preferences, [key]: value };

        setPreferences(next);

        if (!subscription) return;

        try {
            const saved = await updatePushPreferences(subscription.endpoint, next);
            setPreferences({ ...DEFAULT_PREFERENCES, ...saved });
        } catch (err) {
            setPreferences(previous);
            setError(err.response?.data?.message || 'Could not save that change.');
        }
    }, [preferences, subscription]);

    /** Sends a test notification to this account's subscribed devices. */
    const sendTest = useCallback(async () => {
        setIsBusy(true);
        setError(null);

        try {
            return await sendTestNotification();
        } catch (err) {
            setError(err.response?.data?.message || 'Could not send a test notification.');
            return 0;
        } finally {
            setIsBusy(false);
        }
    }, []);

    return {
        supported,
        requiresInstall,
        serverEnabled,
        permission,
        isSubscribed: Boolean(subscription),
        preferences,
        isBusy,
        isLoading,
        error,
        enable,
        disable,
        setCategory,
        sendTest
    };
};
