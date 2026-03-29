export const getFriendlyDeviceName = (username) => {
    const ua = navigator.userAgent;
    let deviceType = 'Device';

    // Detect OS / Device Type
    if (/Windows/.test(ua)) deviceType = 'PC';
    else if (/Macintosh|MacIntel/.test(ua)) deviceType = 'MacBook';
    else if (/iPad/.test(ua)) deviceType = 'iPad';
    else if (/iPhone/.test(ua)) deviceType = 'iPhone';
    else if (/Android/.test(ua)) deviceType = 'Android';
    else if (/Linux/.test(ua)) deviceType = 'Linux PC';

    if (username) {
        // Capitalize first letter of username if needed, or use as is
        const nameKey = username.charAt(0).toUpperCase() + username.slice(1);
        return `${nameKey} ${deviceType}`;
    }

    return `${deviceType} · ${navigator.platform}`;
};

export const getDeviceId = () => {
    let deviceId = localStorage.getItem('device_id');
    if (!deviceId) {
        deviceId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        localStorage.setItem('device_id', deviceId);
    }
    return deviceId;
};

export const getDeviceName = (user) => {
    const storedName = localStorage.getItem('device_name');
    if (storedName) return storedName;

    // If we have a user, try to generate a friendly name
    const username = user?.firstName || user?.email?.split('@')[0];
    return getFriendlyDeviceName(username);
};
