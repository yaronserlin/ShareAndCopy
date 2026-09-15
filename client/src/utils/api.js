/**
 * Shared axios instance for all REST calls to the backend. Sends
 * credentials (cookies) with every request as a fallback, but the
 * primary auth channel is an `Authorization: Bearer` header built from
 * the in-memory/localStorage token store - the `token`/`refreshToken`
 * cookies are cross-site here (client and server on separate origins)
 * and browsers that block third-party cookies won't reliably store or
 * return them even with `SameSite=None; Secure` set.
 *
 * The rule this module exists to enforce: a session is discarded only
 * when the *server* says it is over. A refresh that fails because the
 * device is offline, because the connection dropped mid-flight, or
 * because the backend is still cold-starting is a temporary condition
 * and is retried - it must never cost the user their session. An
 * installed PWA hits exactly those conditions every time it wakes from
 * the background, which is why "it signs me out after a few minutes"
 * was really "the first refresh after resuming failed".
 *
 * Two events are broadcast on `window` for the rest of the app:
 *   - `auth:session-expired` - the session is definitively over.
 *   - `auth:session-degraded` - the server can't be reached right now.
 */

import axios from 'axios';
import { API_BASE_URL } from '../config';
import {
    getAccessToken,
    getRefreshToken,
    setAccessToken,
    setRefreshToken,
    isAccessTokenStale
} from './tokenStore';

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

/** Auth failure codes that mean the session is over and can't be refreshed. */
const FATAL_AUTH_CODES = new Set(['token_revoked']);

/** How many times a refresh is retried when the failure looks temporary. */
const REFRESH_RETRIES = 2;

/** Base delay between refresh retries; doubles on each attempt. */
const REFRESH_RETRY_BASE_MS = 600;

/** Raised when the server has definitively rejected the session. */
export class SessionExpiredError extends Error {
    /** @param {string} [message] */
    constructor(message = 'Session expired') {
        super(message);
        this.name = 'SessionExpiredError';
        this.isSessionExpired = true;
    }
}

/** Raised when a refresh couldn't be completed but the session may still be valid. */
export class TransientAuthError extends Error {
    /** @param {string} [message] */
    constructor(message = 'Could not reach the server') {
        super(message);
        this.name = 'TransientAuthError';
        this.isTransient = true;
    }
}

/** @param {number} ms */
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Decides whether a failed refresh means "the session is over" or "try
 * again later".
 *
 * No response at all is a network problem. 5xx (including the 503 the
 * server returns when it can't verify a token right now) and 429 are the
 * server asking to be tried again. Only an explicit 400/401/403 is the
 * server saying the token itself is no good.
 *
 * @param {Error} error - The axios error from the refresh call.
 * @returns {boolean} Whether the failure is temporary.
 */
const isTransientFailure = (error) => {
    const status = error.response?.status;

    if (!status) return true;
    if (status === 429 || status >= 500) return true;
    if (error.response?.data?.retryable) return true;

    return false;
};

/** Notifies the app that the session is definitively over. */
const announceSessionExpired = (reason) => {
    window.dispatchEvent(new CustomEvent('auth:session-expired', { detail: { reason } }));
};

/** Notifies the app that the server is temporarily unreachable. */
const announceSessionDegraded = (reason) => {
    window.dispatchEvent(new CustomEvent('auth:session-degraded', { detail: { reason } }));
};

let refreshPromise = null;

/**
 * Exchanges the refresh token (sent in the body, since the cookie may
 * never have reached the browser) for a new access/refresh pair,
 * storing both, and sharing one in-flight request across concurrent
 * 401s.
 *
 * Temporary failures are retried with a short backoff before giving up,
 * and even then they reject with a {@link TransientAuthError} that
 * leaves the stored tokens intact.
 *
 * @returns {Promise<string>} The new access token.
 * @throws {SessionExpiredError|TransientAuthError}
 */
export const refreshAccessToken = () => {
    if (refreshPromise) {
        return refreshPromise;
    }

    refreshPromise = (async () => {
        const storedRefreshToken = getRefreshToken();

        if (!storedRefreshToken) {
            throw new SessionExpiredError('No refresh token stored');
        }

        let lastError = null;

        for (let attempt = 0; attempt <= REFRESH_RETRIES; attempt += 1) {
            try {
                const res = await api.post(
                    '/auth/refresh',
                    { refreshToken: getRefreshToken() },
                    { skipAuthRefresh: true }
                );

                setAccessToken(res.data.accessToken);
                if (res.data.refreshToken) {
                    setRefreshToken(res.data.refreshToken);
                }

                return res.data.accessToken;
            } catch (error) {
                lastError = error;

                if (!isTransientFailure(error)) {
                    announceSessionExpired('refresh_rejected');
                    throw new SessionExpiredError(error.response?.data?.message || 'Session expired');
                }

                if (attempt < REFRESH_RETRIES) {
                    await delay(REFRESH_RETRY_BASE_MS * 2 ** attempt);
                }
            }
        }

        announceSessionDegraded('refresh_unreachable');
        throw new TransientAuthError(lastError?.message || 'Could not refresh the session');
    })().finally(() => {
        refreshPromise = null;
    });

    return refreshPromise;
};

/**
 * Refreshes the access token if it is missing or about to expire, so a
 * request doesn't have to fail with a 401 first. Called when the app
 * regains focus or connectivity.
 *
 * @param {number} [skewMs]
 * @returns {Promise<boolean>} Whether a usable access token is now held.
 */
export const ensureFreshAccessToken = async (skewMs) => {
    if (!isAccessTokenStale(skewMs)) {
        return true;
    }

    if (!getRefreshToken()) {
        return false;
    }

    try {
        await refreshAccessToken();
        return true;
    } catch {
        return false;
    }
};

api.interceptors.response.use((response) => {
    return response;
}, async (error) => {
    if (error.response?.status === 429) {
        window.dispatchEvent(new Event('rate-limit-exceeded'));
        return Promise.reject(error);
    }

    const originalRequest = error.config;
    const authCode = error.response?.data?.code;

    const canRetry = error.response?.status === 401 &&
        !FATAL_AUTH_CODES.has(authCode) &&
        originalRequest &&
        !originalRequest.skipAuthRefresh &&
        !originalRequest._retriedAfterRefresh &&
        !REFRESH_EXEMPT_PATHS.some((path) => originalRequest.url?.includes(path));

    if (canRetry) {
        originalRequest._retriedAfterRefresh = true;
        try {
            await refreshAccessToken();
            return api(originalRequest);
        } catch (refreshError) {
            // Tag the original failure so callers can tell "you are
            // signed out" apart from "the network is down", instead of
            // treating every 401 as the end of the session.
            error.isTransientAuth = Boolean(refreshError.isTransient);
            error.isSessionExpired = Boolean(refreshError.isSessionExpired);
            return Promise.reject(error);
        }
    }

    if (error.response?.status === 401 &&
        (FATAL_AUTH_CODES.has(authCode) || originalRequest?._retriedAfterRefresh)) {
        // Either the server named a fatal reason, or the request was
        // rejected again by a token we had just successfully refreshed -
        // both mean this session is genuinely finished.
        error.isSessionExpired = true;
        announceSessionExpired(authCode || 'unauthorized_after_refresh');
    }

    return Promise.reject(error);
});

export default api;
