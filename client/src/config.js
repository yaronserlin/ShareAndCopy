/**
 * Preview: client/src/config.js
 * Description: Frontend application module.
 */

const SERVER_PORT = 5001; 


const getProtocol = (hostname) => {
    const isProd = import.meta.env.MODE === 'production';

    
    if (isProd) {
        return 'https:';
    }

    
    if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
        return 'https:';
    }
    return 'http:';
};

const getDefaultServerUrl = () => {
    if (typeof window !== 'undefined') {
        
        
        
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
