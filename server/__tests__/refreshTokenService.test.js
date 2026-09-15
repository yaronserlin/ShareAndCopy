/**
 * Preview: server/__tests__/refreshTokenService.test.js
 * Description: Refresh-token exchange, including how failures are classified.
 */

jest.mock('../src/models/User');

const User = require('../src/models/User');
const tokenService = require('../src/services/tokenService');
const { refreshAccessToken } = require('../src/services/refreshTokenService');

/** Builds the chained `findById(...).select(...)` mock mongoose returns. */
const mockFindById = (result, { lean = false } = {}) => {
    User.findById.mockReturnValue({
        select: jest.fn().mockReturnValue(lean ? { lean: () => result } : result)
    });
};

/** Builds a `findById` chain that rejects, standing in for a database outage. */
const mockFindByIdFailure = (error, { lean = false } = {}) => {
    User.findById.mockReturnValue({
        select: jest.fn().mockReturnValue(lean ? { lean: () => Promise.reject(error) } : Promise.reject(error))
    });
};

describe('refreshAccessToken', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('issues a new pair for a valid account refresh token', async () => {
        mockFindById(Promise.resolve({ isAdmin: false, revokedDevices: [], authorizedDevices: [] }));

        const refreshToken = tokenService.signRefreshToken({ userId: 'user-1' });
        const result = await refreshAccessToken(refreshToken);

        expect(result.accessToken).toBeTruthy();

        // The returned refresh token is re-signed for the same subject;
        // within the same second it is byte-identical, which is fine -
        // what matters is that it verifies and keeps its claims.
        const decoded = tokenService.verifyRefreshToken(result.refreshToken);
        expect(decoded.id).toBe('user-1');
        expect(decoded.type).toBe('refresh');
    });

    it('rejects a malformed token as a dead session', async () => {
        await expect(refreshAccessToken('not-a-token')).rejects.toMatchObject({ code: 'invalid_token' });
    });

    it('rejects an access token presented as a refresh token', async () => {
        const { token } = tokenService.signAccessToken({ userId: 'user-1' });

        await expect(refreshAccessToken(token)).rejects.toMatchObject({ code: 'invalid_token' });
    });

    it('rejects a refresh token whose device has been revoked', async () => {
        mockFindById(Promise.resolve({
            isAdmin: false,
            revokedDevices: [{ deviceId: 'device-9' }],
            authorizedDevices: []
        }));

        const refreshToken = tokenService.signRefreshToken({ userId: 'user-1', deviceId: 'device-9' });

        await expect(refreshAccessToken(refreshToken)).rejects.toMatchObject({ code: 'invalid_token' });
    });

    it('reports a database outage as temporary rather than ending the session', async () => {
        mockFindByIdFailure(new Error('connection timed out'));

        const refreshToken = tokenService.signRefreshToken({ userId: 'user-1' });

        await expect(refreshAccessToken(refreshToken)).rejects.toMatchObject({ code: 'unavailable' });
    });

    it('refreshes a paired guest session against its host account', async () => {
        mockFindById(Promise.resolve({ revokedDevices: [] }), { lean: true });

        const refreshToken = tokenService.signGuestRefreshToken({
            guestId: 'guest_1',
            roomId: 'host-account'
        });

        const result = await refreshAccessToken(refreshToken);

        expect(result.isGuest).toBe(true);
        expect(result.accessToken).toBeTruthy();
        expect(result.refreshToken).toBeTruthy();
    });

    it('stops refreshing a guest session whose device was revoked by the host', async () => {
        mockFindById(Promise.resolve({ revokedDevices: [{ deviceId: 'device-9' }] }), { lean: true });

        const refreshToken = tokenService.signGuestRefreshToken({
            guestId: 'guest_1',
            roomId: 'host-account',
            deviceId: 'device-9'
        });

        await expect(refreshAccessToken(refreshToken)).rejects.toMatchObject({ code: 'invalid_token' });
    });
});
