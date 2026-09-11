/**
 * Helpers for reading and writing the httpOnly auth cookies (`token` and
 * `refreshToken`).
 */

const cookie = require('cookie');
const env = require('../config/env');

/** Whether cookies should be marked `secure`, based on `PUBLIC_URL`'s scheme. */
const isSecureDeployment = () => typeof env.PUBLIC_URL === 'string' && env.PUBLIC_URL.startsWith('https://');

/** Shared cookie attributes for both auth cookies. */
const baseOptions = () => ({
    httpOnly: true,
    sameSite: 'lax',
    secure: isSecureDeployment(),
    path: '/'
});

/**
 * Parses a `Cookie` header into a plain object.
 *
 * @param {string} header
 * @returns {Object<string, string>}
 */
const parseCookies = (header) => cookie.parse(header || '');

/**
 * Sets the access token cookie (1h expiry) and, if provided, the
 * refresh token cookie (7d expiry, scoped to `/api/auth/refresh`).
 *
 * @param {import('express').Response} res
 * @param {{accessToken?: string, refreshToken?: string}} tokens
 */
const setAuthCookies = (res, { accessToken, refreshToken }) => {
    const cookies = [];
    if (accessToken) {
        cookies.push(cookie.serialize('token', accessToken, { ...baseOptions(), maxAge: 60 * 60 }));
    }
    if (refreshToken) {
        cookies.push(cookie.serialize('refreshToken', refreshToken, { ...baseOptions(), maxAge: 7 * 24 * 60 * 60, path: '/api/auth/refresh' }));
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
