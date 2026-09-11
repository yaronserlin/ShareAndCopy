/**
 * Runtime configuration for the client, resolved from Vite environment
 * variables with sensible localhost defaults for development.
 */

const SERVER_PORT = import.meta.env.VITE_SERVER_PORT || 5001;

/** Base URL of the backend server (protocol + host + port), no path suffix. */
export const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:' + SERVER_PORT;

/** Base URL for REST API requests, i.e. {@link SERVER_URL} plus the `/api` prefix. */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ||
    `${import.meta.env.VITE_SERVER_URL || 'http://localhost:' + SERVER_PORT}/api`

export default API_BASE_URL;