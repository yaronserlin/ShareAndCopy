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
