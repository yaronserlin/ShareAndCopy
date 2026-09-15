/**
 * Preview: server/__tests__/tokenService.test.js
 * Description: Token issuance for accounts and paired guest sessions.
 */

const jwt = require('jsonwebtoken');
const tokenService = require('../src/services/tokenService');
const env = require('../src/config/env');

describe('tokenService', () => {
    it('issues an access token carrying the user, admin flag and a JTI', () => {
        const { token, jti } = tokenService.signAccessToken({ userId: 'user-1', isAdmin: true });
        const decoded = jwt.verify(token, env.JWT_SECRET);

        expect(decoded.id).toBe('user-1');
        expect(decoded.isAdmin).toBe(true);
        expect(decoded.jti).toBe(jti);
        expect(decoded.exp - decoded.iat).toBe(60 * 60);
    });

    it('issues a refresh token bound to the device it was created for', () => {
        const token = tokenService.signRefreshToken({ userId: 'user-1', deviceId: 'device-9' });
        const decoded = tokenService.verifyRefreshToken(token);

        expect(decoded.type).toBe('refresh');
        expect(decoded.deviceId).toBe('device-9');
    });

    it('signs refresh tokens with a different secret than access tokens', () => {
        const refreshToken = tokenService.signRefreshToken({ userId: 'user-1' });

        expect(() => jwt.verify(refreshToken, env.JWT_SECRET)).toThrow();
    });

    it('gives paired guest sessions a refresh token so they survive a reload', () => {
        const refreshToken = tokenService.signGuestRefreshToken({
            guestId: 'guest_1',
            roomId: 'host-account',
            deviceId: 'device-9'
        });
        const decoded = tokenService.verifyRefreshToken(refreshToken);

        expect(decoded.scope).toBe('guest');
        expect(decoded.type).toBe('refresh');
        expect(decoded.roomId).toBe('host-account');
        expect(decoded.deviceId).toBe('device-9');
    });

    it('keeps the guest access token shape the auth middleware expects', () => {
        const { token } = tokenService.signGuestAccessToken({ guestId: 'guest_1', roomId: 'host-account' });
        const decoded = jwt.verify(token, env.JWT_SECRET);

        expect(decoded.scope).toBe('guest');
        expect(decoded.isGuest).toBe(true);
        expect(decoded.roomId).toBe('host-account');
        expect(decoded.jti).toBeTruthy();
    });
});
