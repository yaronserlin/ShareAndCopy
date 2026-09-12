/**
 * Holds the auth tokens client-side so authenticated requests don't
 * depend solely on the cross-site `token`/`refreshToken` cookies, which
 * browsers with third-party-cookie blocking (Safari ITP, Firefox ETP,
 * Chrome) can silently refuse to store or send back even with
 * `SameSite=None; Secure` set correctly server-side. The access token is
 * kept in memory only (short-lived, never touches disk); the refresh
 * token is persisted to `localStorage` so a session survives a reload.
 */

const REFRESH_TOKEN_KEY = 'sac_refreshToken';

let accessToken = null;

/** @returns {string|null} The current in-memory access token, if any. */
export const getAccessToken = () => accessToken;

/** @param {string|null} token */
export const setAccessToken = (token) => {
    accessToken = token || null;
};

/** @returns {string|null} The persisted refresh token, if any. */
export const getRefreshToken = () => {
    try {
        return localStorage.getItem(REFRESH_TOKEN_KEY);
    } catch {
        return null;
    }
};

/** @param {string|null} token */
export const setRefreshToken = (token) => {
    try {
        if (token) {
            localStorage.setItem(REFRESH_TOKEN_KEY, token);
        } else {
            localStorage.removeItem(REFRESH_TOKEN_KEY);
        }
    } catch {
        // localStorage unavailable (private mode, quota) - session just won't survive a reload.
    }
};

/** Clears both the in-memory access token and the persisted refresh token. */
export const clearTokens = () => {
    setAccessToken(null);
    setRefreshToken(null);
};
