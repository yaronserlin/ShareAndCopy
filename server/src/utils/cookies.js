const cookie = require('cookie');
const env = require('../config/env');

const isSecureDeployment = () => typeof env.PUBLIC_URL === 'string' && env.PUBLIC_URL.startsWith('https://');

const baseOptions = () => ({
    httpOnly: true,
    sameSite: 'lax',
    secure: isSecureDeployment(),
    path: '/'
});

const parseCookies = (header) => cookie.parse(header || '');

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

const clearAuthCookies = (res) => {
    res.setHeader('Set-Cookie', [
        cookie.serialize('token', '', { ...baseOptions(), maxAge: 0 }),
        cookie.serialize('refreshToken', '', { ...baseOptions(), maxAge: 0, path: '/api/auth/refresh' })
    ]);
};

module.exports = { parseCookies, setAuthCookies, clearAuthCookies };
