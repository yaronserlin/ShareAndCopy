
const SERVER_PORT = 5001;

export const SERVER_URL = (typeof window !== 'undefined' && window.SERVER_URL)
    ? window.SERVER_URL
    : (import.meta.env.VITE_SERVER_URL || `http://localhost:${SERVER_PORT}`);

const API_BASE_URL = (typeof window !== 'undefined' && window.SERVER_URL)
    ? `${window.SERVER_URL}/api`
    : (import.meta.env.VITE_API_URL || '/api');

export default API_BASE_URL;
