// Dynamic API Configuration
// Automatically detects the current hostname (localhost, IP, etc.) and appends the server port.
// Default server port is 5001.

const SERVER_PORT = 5001;

// If VITE_API_URL is set in .env, use it. Otherwise, construct it dynamically.
const API_BASE_URL = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:${SERVER_PORT}/api`;

export default API_BASE_URL;
