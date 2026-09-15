/**
 * Preview: server/__tests__/refreshTokenController.test.js
 * Description: The status codes the client relies on to tell a dead session from an unreachable server.
 */

jest.mock('../src/services/refreshTokenService');

const refreshTokenService = require('../src/services/refreshTokenService');
const { refreshToken } = require('../src/controllers/refreshTokenController');

describe('refreshTokenController', () => {
    let req, res;

    beforeEach(() => {
        req = { body: {}, cookies: {} };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            setHeader: jest.fn()
        };
        jest.clearAllMocks();
    });

    it('returns a new token pair from a refresh token in the body', async () => {
        refreshTokenService.refreshAccessToken.mockResolvedValue({
            accessToken: 'new-access',
            refreshToken: 'new-refresh'
        });
        req.body.refreshToken = 'stored-refresh';

        await refreshToken(req, res);

        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            success: true,
            accessToken: 'new-access',
            refreshToken: 'new-refresh'
        }));
        expect(res.setHeader).toHaveBeenCalledWith('Set-Cookie', expect.any(Array));
    });

    it('answers 401 when the refresh token itself is rejected', async () => {
        const error = new Error('Invalid or expired refresh token');
        error.code = 'invalid_token';
        refreshTokenService.refreshAccessToken.mockRejectedValue(error);
        req.body.refreshToken = 'stale-refresh';

        await refreshToken(req, res);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ retryable: false }));
    });

    it('answers 503 when the session could not be checked, so the client retries instead of signing out', async () => {
        const error = new Error('Unable to refresh session right now');
        error.code = 'unavailable';
        refreshTokenService.refreshAccessToken.mockRejectedValue(error);
        req.body.refreshToken = 'valid-refresh';

        await refreshToken(req, res);

        expect(res.status).toHaveBeenCalledWith(503);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ retryable: true }));
    });

    it('answers 400 when no refresh token was supplied at all', async () => {
        await refreshToken(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(refreshTokenService.refreshAccessToken).not.toHaveBeenCalled();
    });
});
