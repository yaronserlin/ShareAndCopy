/**
 * Preview: client/src/utils/__tests__/tokenStore.test.js
 * Description: Token storage, expiry awareness and the cached profile a relaunched PWA starts from.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
    setAccessToken,
    getAccessToken,
    getAccessTokenExpiry,
    isAccessTokenStale,
    setRefreshToken,
    getRefreshToken,
    hasPersistedSession,
    setCachedUser,
    getCachedUser,
    clearTokens
} from '../tokenStore';

/** Builds an unsigned JWT with the given expiry, which is all the store reads. */
const tokenExpiringIn = (seconds) => {
    const payload = { exp: Math.floor(Date.now() / 1000) + seconds };
    const encoded = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_');
    return `header.${encoded}.signature`;
};

describe('tokenStore', () => {
    beforeEach(() => {
        localStorage.clear();
        setAccessToken(null);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('keeps the access token in memory and reads its expiry', () => {
        setAccessToken(tokenExpiringIn(3600));

        expect(getAccessToken()).toBeTruthy();
        expect(getAccessTokenExpiry()).toBeGreaterThan(Date.now());
        expect(localStorage.getItem('sac_accessToken')).toBeNull();
    });

    it('treats a missing token as stale', () => {
        setAccessToken(null);
        expect(isAccessTokenStale()).toBe(true);
    });

    it('treats a token near expiry as stale so it is refreshed before use', () => {
        setAccessToken(tokenExpiringIn(30));
        expect(isAccessTokenStale(60_000)).toBe(true);
    });

    it('treats a token with plenty of life left as fresh', () => {
        setAccessToken(tokenExpiringIn(3600));
        expect(isAccessTokenStale(60_000)).toBe(false);
    });

    it('persists the refresh token so a session survives a reload', () => {
        setRefreshToken('refresh-value');

        expect(getRefreshToken()).toBe('refresh-value');
        expect(hasPersistedSession()).toBe(true);
    });

    it('round-trips the cached profile', () => {
        setCachedUser({ isAdmin: false, roomId: 'room-1' });

        expect(getCachedUser()).toEqual({ isAdmin: false, roomId: 'room-1' });
    });

    it('clears everything on sign-out', () => {
        setAccessToken(tokenExpiringIn(3600));
        setRefreshToken('refresh-value');
        setCachedUser({ roomId: 'room-1' });

        clearTokens();

        expect(getAccessToken()).toBeNull();
        expect(getRefreshToken()).toBeNull();
        expect(getCachedUser()).toBeNull();
    });

    it('survives storage being unavailable, as in private browsing', () => {
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('storage disabled');
        });
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new Error('storage disabled');
        });

        expect(() => setRefreshToken('refresh-value')).not.toThrow();
        expect(getRefreshToken()).toBeNull();
        expect(getCachedUser()).toBeNull();
    });
});
