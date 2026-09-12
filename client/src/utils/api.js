/**
 * Shared axios instance for all REST calls to the backend. Sends
 * credentials (cookies) with every request, broadcasts a
 * `rate-limit-exceeded` window event on HTTP 429 responses, and
 * transparently refreshes an expired access token (via the refresh
 * token cookie) once before giving up on a 401. An explicitly revoked
 * token (device revocation / force-logout) is never retried this way,
 * so a revoked device can't silently regain access via refresh.
 */

import axios from 'axios';
import { API_BASE_URL } from '../config';

const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json'
    }
});

/** Endpoints that must never trigger a refresh-and-retry on 401. */
const REFRESH_EXEMPT_PATHS = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'];

let refreshPromise = null;

/** Exchanges the refresh-token cookie for a new access token, sharing one in-flight request across concurrent 401s. */
const refreshAccessToken = () => {
    if (!refreshPromise) {
        refreshPromise = api.post('/auth/refresh').finally(() => {
            refreshPromise = null;
        });
    }
    return refreshPromise;
};

api.interceptors.response.use((response) => {
    return response;
}, async (error) => {
    if (error.response && error.response.status === 429) {
        window.dispatchEvent(new Event('rate-limit-exceeded'));
        return Promise.reject(error);
    }

    const originalRequest = error.config;
    const canRetry = error.response?.status === 401 &&
        error.response?.data?.message !== 'Token has been revoked' &&
        originalRequest &&
        !originalRequest._retriedAfterRefresh &&
        !REFRESH_EXEMPT_PATHS.some((path) => originalRequest.url?.includes(path));

    if (canRetry) {
        originalRequest._retriedAfterRefresh = true;
        try {
            await refreshAccessToken();
            return api(originalRequest);
        } catch {
            return Promise.reject(error);
        }
    }

    return Promise.reject(error);
});

export default api;
