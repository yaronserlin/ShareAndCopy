/**
 * Helpers for identifying and naming the current device for pairing and
 * socket registration.
 */

/**
 * Builds a human-friendly device label from the user agent, optionally
 * personalized with a username.
 *
 * @param {string} [username] - Prefixes the label when provided.
 * @returns {string} A display name like "Jane MacBook" or "PC · Win32".
 */
export const getFriendlyDeviceName = (username) => {
    const ua = navigator.userAgent;
    let deviceType = 'Device';

    if (/Windows/.test(ua)) deviceType = 'PC';
    else if (/Macintosh|MacIntel/.test(ua)) deviceType = 'MacBook';
    else if (/iPad/.test(ua)) deviceType = 'iPad';
    else if (/iPhone/.test(ua)) deviceType = 'iPhone';
    else if (/Android/.test(ua)) deviceType = 'Android';
    else if (/Linux/.test(ua)) deviceType = 'Linux PC';

    if (username) {
        const nameKey = username.charAt(0).toUpperCase() + username.slice(1);
        return `${nameKey} ${deviceType}`;
    }

    return `${deviceType} · ${navigator.platform}`;
};

/**
 * Returns this browser's persistent device ID, generating and storing
 * one in `localStorage` on first use.
 *
 * @returns {string} The device ID.
 */
export const getDeviceId = () => {
    let deviceId = localStorage.getItem('device_id');
    if (!deviceId) {
        deviceId = typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        localStorage.setItem('device_id', deviceId);
    }
    return deviceId;
};

/**
 * Returns this device's display name: a locally stored override if set,
 * otherwise a generated friendly name based on the user's identity.
 *
 * @param {Object} [user] - The current user, if any.
 * @returns {string} The device's display name.
 */
export const getDeviceName = (user) => {
    const storedName = localStorage.getItem('device_name');
    if (storedName) return storedName;

    const username = user?.firstName || user?.email?.split('@')[0];
    return getFriendlyDeviceName(username);
};
