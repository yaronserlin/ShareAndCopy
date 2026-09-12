/**
 * Shared axios instance for all REST calls to the backend. Sends
 * credentials (cookies) with every request as a fallback, but the
 * primary auth channel is an `Authorization: Bearer` header built from
 * the in-memory/localStorage token store — the `token`/`refreshToken`
 * cookies are cross-site here (client and server on separate origins)
 * and browsers that block third-party cookies won't reliably store or
 * return them even with `SameSite=None; Secure` set. Also broadcasts a
 * `rate-limit-exceeded` window event on HTTP 429 responses, and
 * transparently refreshes an expired access token once before giving up
 * on a 401. An explicitly revoked token (device revocation /
 * force-logout) is never retried this way, so a revoked device can't
 * silently regain access via refresh.
 */

import axios from 'axios';
import { API_BASE_URL } from '../config';
import { getAccessToken, getRefreshToken, setAccessToken, setRefreshToken } from './tokenStore';

const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json'
    }
});

api.interceptors.request.use((config) => {
    const token = getAccessToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

/** Endpoints that must never trigger a refresh-and-retry on 401. */
const REFRESH_EXEMPT_PATHS = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'];

let refreshPromise = null;

/**
 * Exchanges the refresh token (sent in the body, since the cookie may
 * never have reached the browser) for a new access/refresh pair,
 * storing both, and sharing one in-flight request across concurrent
 * 401s.
 */
export const refreshAccessToken = () => {
    if (!refreshPromise) {
        refreshPromise = api.post('/auth/refresh', { refreshToken: getRefreshToken() })
            .then((res) => {
                setAccessToken(res.data.accessToken);
                if (res.data.refreshToken) setRefreshToken(res.data.refreshToken);
                return res;
            })
            .finally(() => {
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
