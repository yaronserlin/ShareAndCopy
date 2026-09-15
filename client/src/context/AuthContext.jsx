/**
 * Authentication context: tracks the signed-in user, re-establishes the
 * session on mount and whenever the app comes back to the foreground,
 * and exposes `isLoading` until the first check settles.
 *
 * Session bootstrap uses the persisted refresh token rather than the
 * `token`/`refreshToken` cookies alone: client and server are separate
 * origins here, and browsers that block third-party cookies won't
 * reliably keep or return a `SameSite=None` cookie across a reload, even
 * though it's set correctly server-side.
 *
 * The central rule is that only the server ends a session. A failed
 * network call, a cold-starting backend or a socket that reconnected
 * with a stale token are all recoverable, and are recovered from - the
 * user is signed out only when the server explicitly rejects the
 * refresh token, or when they ask to be. This matters most in an
 * installed PWA, where the OS discards the web view in the background
 * and every return to the app is a fresh start that has to re-establish
 * the session, often while the network is still waking up.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { ensureFreshAccessToken } from '../utils/api';
import {
    getAccessToken,
    setAccessToken,
    setRefreshToken,
    clearTokens,
    hasPersistedSession,
    getCachedUser,
    setCachedUser
} from '../utils/tokenStore';

const AuthContext = createContext(null);

/** Minimum gap between foreground re-validations, so tab switching doesn't spam the API. */
const REVALIDATE_THROTTLE_MS = 15_000;

/** How often an active session tops up its access token before it expires. */
const REFRESH_TICK_MS = 60_000;

/** Refresh the access token once it is within this long of expiring. */
const REFRESH_SKEW_MS = 5 * 60_000;

/**
 * Provides authentication state and actions to descendant components.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @returns {JSX.Element} The context provider wrapping `children`.
 */
export const AuthProvider = ({ children }) => {
    // Start from the cached profile so a relaunched PWA renders its
    // signed-in shell immediately instead of flashing the login screen
    // while the session is re-established in the background.
    const cachedUser = getCachedUser();
    const hasStoredSession = hasPersistedSession();

    const [user, setUser] = useState(hasStoredSession ? cachedUser : null);
    const [isAuthenticated, setIsAuthenticated] = useState(Boolean(hasStoredSession && cachedUser));
    const [isLoading, setIsLoading] = useState(true);
    const [isOffline, setIsOffline] = useState(false);
    const [roomId, setRoomId] = useState(localStorage.getItem('roomId'));
    const navigate = useNavigate();

    const loggingOutRef = useRef(false);
    const lastRevalidatedAtRef = useRef(0);
    const bootstrappedRef = useRef(false);

    /**
     * Drops all local session state and returns the user to the home
     * page. Used both for an explicit sign-out and for a session the
     * server has rejected.
     */
    const endSession = useCallback(() => {
        localStorage.removeItem('roomId');
        clearTokens();
        setIsAuthenticated(false);
        setRoomId(null);
        setUser(null);
        setIsOffline(false);
        navigate('/', { replace: true });
    }, [navigate]);

    /**
     * Logs the current user out: notifies the server, clears local auth
     * state, and redirects to the home page. Reentrant calls (e.g. a
     * logout button click racing a session-expiry event) are ignored
     * while one is already in flight.
     *
     * @returns {Promise<void>}
     */
    const logout = useCallback(async () => {
        if (loggingOutRef.current) return;
        loggingOutRef.current = true;

        try {
            await api.post('/auth/logout');
        } catch (error) {
            console.error('Logout request failed', error);
        }

        endSession();
        loggingOutRef.current = false;
    }, [endSession]);

    /**
     * Marks the user as authenticated, persists their room ID, and
     * stores the issued tokens (access token in memory, refresh token in
     * `localStorage`) so the session survives a reload.
     *
     * @param {string} newRoomId - Room ID assigned to the authenticated user.
     * @param {boolean} isAdmin - Whether the user has admin privileges.
     * @param {string} [accessToken] - Access token issued for this session.
     * @param {string} [refreshToken] - Refresh token issued for this session.
     * @param {boolean} [isGuest] - Whether this is a paired-device guest session, not a full account.
     */
    const login = useCallback((newRoomId, isAdmin, accessToken, refreshToken, isGuest = false) => {
        localStorage.setItem('roomId', newRoomId);
        if (accessToken) setAccessToken(accessToken);
        if (refreshToken) setRefreshToken(refreshToken);

        const profile = { isAuthenticated: true, isAdmin, isGuest, roomId: newRoomId };

        setCachedUser(profile);
        setRoomId(newRoomId);
        setIsAuthenticated(true);
        setIsOffline(false);
        setUser(profile);
    }, []);

    /**
     * Confirms the session with the server, refreshing the access token
     * first when it is missing or stale.
     *
     * A definitive rejection ends the session; anything else (offline,
     * server not reachable yet) leaves the session intact and just marks
     * the app as temporarily disconnected, so it can recover on the next
     * attempt rather than forcing a sign-in.
     *
     * @param {{force?: boolean}} [options]
     * @returns {Promise<void>}
     */
    const revalidate = useCallback(async ({ force = false } = {}) => {
        if (!hasPersistedSession() && !getAccessToken()) {
            setIsAuthenticated(false);
            setUser(null);
            setIsLoading(false);
            return;
        }

        const now = Date.now();
        if (!force && now - lastRevalidatedAtRef.current < REVALIDATE_THROTTLE_MS) {
            return;
        }
        lastRevalidatedAtRef.current = now;

        try {
            await ensureFreshAccessToken(REFRESH_SKEW_MS);

            const res = await api.get('/auth/verify');

            if (res.status === 200 && res.data.success) {
                const verifiedUser = res.data.data.user;

                setIsAuthenticated(true);
                setUser(verifiedUser);
                setCachedUser(verifiedUser);
                setIsOffline(false);

                if (verifiedUser?.roomId) {
                    setRoomId(verifiedUser.roomId);
                    localStorage.setItem('roomId', verifiedUser.roomId);
                }
            }
        } catch (error) {
            const rejectedByServer = error.isSessionExpired ||
                (error.response?.status === 401 && !error.isTransientAuth);

            if (rejectedByServer) {
                endSession();
                return;
            }

            // Couldn't reach the server. Keep the session and whatever
            // profile we already have; the next resume, reconnect or
            // request will try again.
            console.warn('Session check deferred:', error.message);
            setIsOffline(true);
        } finally {
            setIsLoading(false);
        }
    }, [endSession]);

    useEffect(() => {
        // Runs once on mount - StrictMode's double-invoked effects in
        // development must not fire two session checks. Later checks are
        // driven by the lifecycle listeners below.
        if (bootstrappedRef.current) return;
        bootstrappedRef.current = true;

        revalidate({ force: true });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        /** The server has rejected the session outright - sign out locally. */
        const handleExpired = () => {
            if (loggingOutRef.current) return;
            endSession();
        };

        /** The server is temporarily unreachable - stay signed in, show it. */
        const handleDegraded = () => setIsOffline(true);

        window.addEventListener('auth:session-expired', handleExpired);
        window.addEventListener('auth:session-degraded', handleDegraded);

        return () => {
            window.removeEventListener('auth:session-expired', handleExpired);
            window.removeEventListener('auth:session-degraded', handleDegraded);
        };
    }, [endSession]);

    useEffect(() => {
        if (!isAuthenticated) return undefined;

        /**
         * Re-checks the session when the app returns to the foreground.
         * On mobile this is the moment that used to break: the web view
         * had been discarded, the in-memory access token was gone, and
         * whatever happened on the very first request decided whether
         * the user stayed signed in.
         */
        const handleResume = () => {
            if (document.visibilityState === 'visible') {
                revalidate();
            }
        };

        /** A page restored from the back/forward cache resumes the same way. */
        const handlePageShow = (event) => {
            if (event.persisted) {
                revalidate({ force: true });
            }
        };

        /** Connectivity is back: retry immediately rather than waiting for a user action. */
        const handleOnline = () => revalidate({ force: true });

        document.addEventListener('visibilitychange', handleResume);
        window.addEventListener('focus', handleResume);
        window.addEventListener('pageshow', handlePageShow);
        window.addEventListener('online', handleOnline);

        return () => {
            document.removeEventListener('visibilitychange', handleResume);
            window.removeEventListener('focus', handleResume);
            window.removeEventListener('pageshow', handlePageShow);
            window.removeEventListener('online', handleOnline);
        };
    }, [isAuthenticated, revalidate]);

    useEffect(() => {
        if (!isAuthenticated) return undefined;

        // Top the access token up before it expires, so an active
        // session never has to recover from a 401 in the first place.
        const timer = setInterval(() => {
            if (document.visibilityState === 'visible') {
                ensureFreshAccessToken(REFRESH_SKEW_MS);
            }
        }, REFRESH_TICK_MS);

        return () => clearInterval(timer);
    }, [isAuthenticated]);

    const value = useMemo(
        () => ({ user, isAuthenticated, isLoading, isOffline, roomId, login, logout, revalidate }),
        [user, isAuthenticated, isLoading, isOffline, roomId, login, logout, revalidate]
    );

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

/** @returns {Object} The current auth context value (user, state, actions). */
export const useAuth = () => useContext(AuthContext);
