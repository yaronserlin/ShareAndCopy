/**
 * Holds the auth tokens client-side so authenticated requests don't
 * depend solely on the cross-site `token`/`refreshToken` cookies, which
 * browsers with third-party-cookie blocking (Safari ITP, Firefox ETP,
 * Chrome) can silently refuse to store or send back even with
 * `SameSite=None; Secure` set correctly server-side. The access token is
 * kept in memory only (short-lived, never touches disk); the refresh
 * token is persisted to `localStorage` so a session survives a reload.
 *
 * Reloads are the normal case, not the exception: an installed PWA has
 * its web view discarded whenever the OS needs the memory, so coming
 * back to the app after a few minutes in the background usually means
 * starting from a blank JavaScript context with only `localStorage`
 * left. Everything here is therefore written so that the persisted half
 * is enough to restore a session on its own.
 */

const REFRESH_TOKEN_KEY = 'sac_refreshToken';
const USER_KEY = 'sac_user';

let accessToken = null;
let accessTokenExpiry = null;

/**
 * Reads a JWT's `exp` claim without verifying it. The value is only
 * used to decide when to refresh early - the server remains the only
 * authority on whether a token is actually valid.
 *
 * @param {string} token
 * @returns {number|null} Expiry as epoch milliseconds, or `null` if unreadable.
 */
const readExpiry = (token) => {
    try {
        const [, payload] = token.split('.');
        const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
        const { exp } = JSON.parse(atob(normalized));
        return typeof exp === 'number' ? exp * 1000 : null;
    } catch {
        return null;
    }
};

/** Safe `localStorage` read: private mode and blocked storage both throw. */
const readStorage = (key) => {
    try {
        return localStorage.getItem(key);
    } catch {
        return null;
    }
};

/** Safe `localStorage` write; removes the key when `value` is falsy. */
const writeStorage = (key, value) => {
    try {
        if (value) {
            localStorage.setItem(key, value);
        } else {
            localStorage.removeItem(key);
        }
    } catch {
        // Storage unavailable (private mode, quota, blocked cookies) -
        // the session just won't survive a reload.
    }
};

/** @returns {string|null} The current in-memory access token, if any. */
export const getAccessToken = () => accessToken;

/** @param {string|null} token */
export const setAccessToken = (token) => {
    accessToken = token || null;
    accessTokenExpiry = token ? readExpiry(token) : null;
};

/** @returns {number|null} The access token's expiry, in epoch ms. */
export const getAccessTokenExpiry = () => accessTokenExpiry;

/**
 * Whether the in-memory access token is missing, already expired, or
 * close enough to expiry that it should be refreshed before use.
 *
 * @param {number} [skewMs=60000] - Treat a token expiring within this window as stale.
 * @returns {boolean}
 */
export const isAccessTokenStale = (skewMs = 60_000) => {
    if (!accessToken) return true;
    if (!accessTokenExpiry) return false;
    return Date.now() >= accessTokenExpiry - skewMs;
};

/** @returns {string|null} The persisted refresh token, if any. */
export const getRefreshToken = () => readStorage(REFRESH_TOKEN_KEY);

/** @param {string|null} token */
export const setRefreshToken = (token) => writeStorage(REFRESH_TOKEN_KEY, token);

/** @returns {boolean} Whether a session can potentially be restored from storage. */
export const hasPersistedSession = () => Boolean(getRefreshToken());

/**
 * Caches the last verified user profile, so the app can render its
 * signed-in shell immediately on launch instead of flashing the login
 * screen while the network call that confirms the session is still in
 * flight - or, offline, never completes. It is a UI hint only: every
 * request is still authorized by the server.
 *
 * @param {Object|null} user
 */
export const setCachedUser = (user) => {
    writeStorage(USER_KEY, user ? JSON.stringify(user) : null);
};

/** @returns {Object|null} The cached user profile, if one was stored. */
export const getCachedUser = () => {
    const raw = readStorage(USER_KEY);
    if (!raw) return null;

    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
};

/** Clears the in-memory access token, the persisted refresh token and the cached profile. */
export const clearTokens = () => {
    setAccessToken(null);
    setRefreshToken(null);
    setCachedUser(null);
};
