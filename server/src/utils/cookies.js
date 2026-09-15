/**
 * Helpers for reading and writing the httpOnly auth cookies (`token` and
 * `refreshToken`). Uses `SameSite=None` over HTTPS so the cookies still
 * reach the API when the client and server are deployed as separate
 * sites (e.g. two different Render services) rather than behind a
 * shared reverse-proxy domain — `SameSite=Lax` is never sent back on a
 * cross-site fetch/XHR, only on a top-level navigation.
 */

const cookie = require('cookie');
const env = require('../config/env');
const { toSeconds } = require('./duration');

/** Whether cookies should be marked `secure`, based on `PUBLIC_URL`'s scheme. */
const isSecureDeployment = () => typeof env.PUBLIC_URL === 'string' && env.PUBLIC_URL.startsWith('https://');

/**
 * Shared cookie attributes for both auth cookies. `SameSite=None`
 * requires `Secure`, so it's only used once we know the deployment is
 * HTTPS; local HTTP dev falls back to `Lax`, which is sufficient there.
 */
const baseOptions = () => {
    const secure = isSecureDeployment();
    return {
        httpOnly: true,
        sameSite: secure ? 'none' : 'lax',
        secure,
        path: '/'
    };
};

/**
 * Parses a `Cookie` header into a plain object.
 *
 * @param {string} header
 * @returns {Object<string, string>}
 */
const parseCookies = (header) => cookie.parse(header || '');

/**
 * Sets the access token cookie and, if provided, the refresh token
 * cookie (scoped to `/api/auth/refresh`). Both expiries are derived from
 * the configured token lifetimes so the cookie never outlives - or dies
 * before - the token it carries.
 *
 * @param {import('express').Response} res
 * @param {{accessToken?: string, refreshToken?: string}} tokens
 */
const setAuthCookies = (res, { accessToken, refreshToken }) => {
    const cookies = [];
    if (accessToken) {
        cookies.push(cookie.serialize('token', accessToken, {
            ...baseOptions(),
            maxAge: toSeconds(env.ACCESS_TOKEN_TTL, 60 * 60)
        }));
    }
    if (refreshToken) {
        cookies.push(cookie.serialize('refreshToken', refreshToken, {
            ...baseOptions(),
            maxAge: toSeconds(env.REFRESH_TOKEN_TTL, 30 * 24 * 60 * 60),
            path: '/api/auth/refresh'
        }));
    }
    res.setHeader('Set-Cookie', cookies);
};

/**
 * Clears both auth cookies by re-setting them with an immediate expiry.
 *
 * @param {import('express').Response} res
 */
const clearAuthCookies = (res) => {
    res.setHeader('Set-Cookie', [
        cookie.serialize('token', '', { ...baseOptions(), maxAge: 0 }),
        cookie.serialize('refreshToken', '', { ...baseOptions(), maxAge: 0, path: '/api/auth/refresh' })
    ]);
};

module.exports = { parseCookies, setAuthCookies, clearAuthCookies };
