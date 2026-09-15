/**
 * Preview: client/src/utils/__tests__/api.test.js
 * Description: How the API client classifies refresh failures - the difference between "signed out" and "offline".
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Hoisted so the axios mock below - which Vitest lifts above the
// imports - can close over the same fake instance the tests assert on.
const { instance } = vi.hoisted(() => ({
    instance: Object.assign(vi.fn(), {
        get: vi.fn(),
        post: vi.fn(),
        patch: vi.fn(),
        interceptors: {
            request: { use: vi.fn() },
            response: { use: vi.fn() }
        }
    })
}));

vi.mock('axios', () => ({
    default: { create: () => instance }
}));

import { refreshAccessToken, ensureFreshAccessToken, SessionExpiredError, TransientAuthError } from '../api';
import { setRefreshToken, getRefreshToken, setAccessToken, getAccessToken } from '../tokenStore';

/** An axios error with no response: the request never reached the server. */
const networkError = () => Object.assign(new Error('Network Error'), { response: undefined });

/** An axios error carrying an HTTP status. */
const httpError = (status, data = {}) => Object.assign(new Error(`Request failed with status ${status}`), {
    response: { status, data }
});

/** A successful refresh response. */
const refreshOk = () => ({ data: { accessToken: 'new-access', refreshToken: 'new-refresh' } });

describe('refreshAccessToken', () => {
    beforeEach(() => {
        localStorage.clear();
        setAccessToken(null);
        vi.clearAllMocks();
    });

    it('retries a refresh that failed because the server was unreachable', async () => {
        setRefreshToken('stored-refresh');
        instance.post
            .mockRejectedValueOnce(networkError())
            .mockResolvedValueOnce(refreshOk());

        const token = await refreshAccessToken();

        expect(token).toBe('new-access');
        expect(instance.post).toHaveBeenCalledTimes(2);
        expect(getAccessToken()).toBe('new-access');
        expect(getRefreshToken()).toBe('new-refresh');
    });

    it('retries a 503, which is how the server says "ask me again"', async () => {
        setRefreshToken('stored-refresh');
        instance.post
            .mockRejectedValueOnce(httpError(503, { retryable: true }))
            .mockResolvedValueOnce(refreshOk());

        await expect(refreshAccessToken()).resolves.toBe('new-access');
        expect(instance.post).toHaveBeenCalledTimes(2);
    });

    it('keeps the stored session when the server stays unreachable', async () => {
        setRefreshToken('stored-refresh');
        instance.post.mockRejectedValue(networkError());

        const degraded = vi.fn();
        window.addEventListener('auth:session-degraded', degraded);

        await expect(refreshAccessToken()).rejects.toBeInstanceOf(TransientAuthError);

        // The session is intact - this is exactly the case that used to
        // sign people out of the installed app on resume.
        expect(getRefreshToken()).toBe('stored-refresh');
        expect(degraded).toHaveBeenCalled();

        window.removeEventListener('auth:session-degraded', degraded);
    });

    it('reports an expired session when the server rejects the refresh token', async () => {
        setRefreshToken('stale-refresh');
        instance.post.mockRejectedValue(httpError(401, { message: 'Invalid or expired refresh token' }));

        const expired = vi.fn();
        window.addEventListener('auth:session-expired', expired);

        await expect(refreshAccessToken()).rejects.toBeInstanceOf(SessionExpiredError);
        expect(instance.post).toHaveBeenCalledTimes(1);
        expect(expired).toHaveBeenCalled();

        window.removeEventListener('auth:session-expired', expired);
    });

    it('reports an expired session when there is nothing stored to refresh with', async () => {
        await expect(refreshAccessToken()).rejects.toBeInstanceOf(SessionExpiredError);
        expect(instance.post).not.toHaveBeenCalled();
    });

    it('shares one in-flight refresh between concurrent callers', async () => {
        setRefreshToken('stored-refresh');
        instance.post.mockResolvedValue(refreshOk());

        await Promise.all([refreshAccessToken(), refreshAccessToken(), refreshAccessToken()]);

        expect(instance.post).toHaveBeenCalledTimes(1);
    });
});

describe('ensureFreshAccessToken', () => {
    beforeEach(() => {
        localStorage.clear();
        setAccessToken(null);
        vi.clearAllMocks();
    });

    it('refreshes when no access token is held', async () => {
        setRefreshToken('stored-refresh');
        instance.post.mockResolvedValue(refreshOk());

        await expect(ensureFreshAccessToken()).resolves.toBe(true);
        expect(instance.post).toHaveBeenCalledTimes(1);
    });

    it('reports failure without throwing when the refresh cannot be completed', async () => {
        setRefreshToken('stored-refresh');
        instance.post.mockRejectedValue(networkError());

        await expect(ensureFreshAccessToken()).resolves.toBe(false);
        expect(getRefreshToken()).toBe('stored-refresh');
    });

    it('does nothing when the current token is still fresh', async () => {
        const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }))
            .replace(/\+/g, '-')
            .replace(/\//g, '_');
        setAccessToken(`header.${payload}.signature`);

        await expect(ensureFreshAccessToken(60_000)).resolves.toBe(true);
        expect(instance.post).not.toHaveBeenCalled();
    });
});
