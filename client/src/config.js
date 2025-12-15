// Dynamic API Configuration
// Automatically detects the current hostname (localhost, IP, etc.) and appends the server port.
// Default server port is 5001.

const SERVER_PORT = 5001;

// If VITE_API_URL is set in .env, use it. Otherwise, construct it dynamically.
// If VITE_API_URL is set in .env, use it. Otherwise, use relative path to allow proxying.
// Priority: 1. Injected Runtime Config (from Cloudflare Tunnel) 2. Build-time Env Var 3. Default Relative Path
const API_BASE_URL = (typeof window !== 'undefined' && window.SERVER_URL)
    ? `${window.SERVER_URL}/api`
    : (import.meta.env.VITE_API_URL || '/api');

export default API_BASE_URL;
