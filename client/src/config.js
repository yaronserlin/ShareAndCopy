
const SERVER_PORT = 5001; // Match server default port (changed from 5000 due to macOS ControlCenter)

// Helper to determine protocol
const getProtocol = (hostname) => {
    const isProd = import.meta.env.MODE === 'production';

    // SECURITY: Force HTTPS in production
    if (isProd) {
        return 'https:';
    }

    // In development, respect current protocol
    if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
        return 'https:';
    }
    return 'http:';
};

const getDefaultServerUrl = () => {
    if (typeof window !== 'undefined') {
        // If we are serving from the same domain (production build served by Nginx or similar)
        // just use the relative path or current origin if API is on same host
        // But for development defaults:
        return `${getProtocol(window.location.hostname)}//${window.location.hostname}:${SERVER_PORT}`;
    }
    return `http://localhost:${SERVER_PORT}`;
};

export const SERVER_URL = (typeof window !== 'undefined' && window.SERVER_URL)
    ? window.SERVER_URL
    : (import.meta.env.VITE_SERVER_URL || getDefaultServerUrl());

export const API_BASE_URL = (typeof window !== 'undefined' && window.SERVER_URL)
    ? `${window.SERVER_URL}/api`
    : (import.meta.env.VITE_API_URL || `${SERVER_URL}/api`);

export default API_BASE_URL;
