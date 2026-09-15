/**
 * Socket.IO connection context: opens an authenticated socket while the
 * user is signed in, tears it down on sign-out, and keeps the connection
 * alive across the suspend/resume cycle an installed PWA goes through
 * constantly.
 *
 * Authenticates via `auth.token` (the access token) rather than
 * `withCredentials`/cookies alone: client and server are separate
 * origins here, and a browser blocking third-party cookies would never
 * deliver the `token` cookie to the socket handshake, even though the
 * server's `io.use` middleware already accepts it as a fallback.
 *
 * The token is resolved per connection attempt, not captured once. A
 * socket that reconnects after the app was backgrounded would otherwise
 * replay the token it was created with - by then often expired - be
 * rejected, and (previously) sign the user out of an otherwise healthy
 * session. Now an expired token is refreshed and the connection retried;
 * only an explicitly revoked session ends it.
 */

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';
import { SERVER_URL } from '../config';
import { getFriendlyDeviceName, getDeviceId } from '../utils/deviceUtils';
import { getAccessToken } from '../utils/tokenStore';
import { ensureFreshAccessToken } from '../utils/api';

const SocketContext = createContext();

/** @returns {import('socket.io-client').Socket|null} The shared socket, or `null` if not connected. */
export const useSocket = () => useContext(SocketContext);

/** Handshake errors that mean the session itself is over. */
const FATAL_SOCKET_ERRORS = new Set([
    'Authentication error: Token revoked'
]);

/** Handshake errors that a token refresh can resolve. */
const RECOVERABLE_SOCKET_ERRORS = new Set([
    'Authentication error: Token expired',
    'Authentication error: No token provided',
    'Authentication error: Invalid token',
    'Authentication error: User not found'
]);

/** Delay before retrying a handshake that failed for a recoverable reason. */
const RECONNECT_DELAY_MS = 1_000;

/**
 * How many consecutive token-related handshake rejections to absorb
 * before concluding the session really is dead. A few are expected (a
 * token that expired while the app was backgrounded, a refresh that
 * raced the reconnect); an unbroken run of them is not.
 */
const MAX_AUTH_RETRIES = 5;

/**
 * Provides a single shared Socket.IO connection to descendant components,
 * keyed to the current authentication state.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @returns {JSX.Element} The context provider wrapping `children`.
 */
export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const { user, isAuthenticated, logout } = useAuth();
    const socketRef = useRef(null);
    const retryTimerRef = useRef(null);
    const authFailureCountRef = useRef(0);

    useEffect(() => {
        if (!isAuthenticated) {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
                setSocket(null);
            }
            return undefined;
        }

        const newSocket = io(SERVER_URL, {
            withCredentials: true,
            // Resolved on every (re)connection attempt, and given the
            // chance to refresh first, so the handshake always carries a
            // currently-valid token.
            auth: async (cb) => {
                await ensureFreshAccessToken();
                cb({ token: getAccessToken() });
            },
            query: {
                deviceId: getDeviceId(),
                deviceName: getDeviceName(user)
            },
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 10000,
            timeout: 20000
        });

        socketRef.current = newSocket;
        authFailureCountRef.current = 0;

        newSocket.on('connect', () => {
            authFailureCountRef.current = 0;
            console.log('Socket connected:', newSocket.id);
        });

        newSocket.on('connect_error', async (err) => {
            if (FATAL_SOCKET_ERRORS.has(err.message)) {
                console.warn('Socket session revoked -> logging out');
                logout();
                return;
            }

            if (!RECOVERABLE_SOCKET_ERRORS.has(err.message)) {
                // Transport-level failure: socket.io's own reconnection
                // handles it, no session action needed.
                console.warn('Socket connection error:', err.message);
                return;
            }

            authFailureCountRef.current += 1;

            if (authFailureCountRef.current > MAX_AUTH_RETRIES) {
                console.warn('Socket auth kept failing after refreshing -> logging out');
                logout();
                return;
            }

            // The handshake was rejected over the token. Refresh it and
            // try again; the session only ends if the server rejects the
            // refresh token too, which it reports through the auth
            // events that AuthContext listens for.
            const refreshed = await ensureFreshAccessToken(0);

            if (!refreshed) {
                console.warn('Socket auth failed and the token could not be refreshed; will retry');
            }

            clearTimeout(retryTimerRef.current);
            retryTimerRef.current = setTimeout(() => {
                if (socketRef.current && !socketRef.current.connected) {
                    socketRef.current.connect();
                }
            }, RECONNECT_DELAY_MS);
        });

        newSocket.on('force-logout', () => {
            console.warn('Server forced logout -> Logging out');
            logout();
        });

        setSocket(newSocket);

        return () => {
            clearTimeout(retryTimerRef.current);
            newSocket.disconnect();
            if (socketRef.current === newSocket) {
                socketRef.current = null;
            }
        };
        // `user` is read only for the device label, and changing it
        // shouldn't tear down a live connection.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated, logout]);

    useEffect(() => {
        if (!socket) return undefined;

        /**
         * Reconnects when the app is brought back to the foreground.
         * A backgrounded PWA's socket is usually killed without a close
         * frame, so the client can sit on a dead connection believing it
         * is still online until something forces the issue.
         */
        const handleResume = () => {
            if (document.visibilityState === 'visible' && !socket.connected) {
                socket.connect();
            }
        };

        document.addEventListener('visibilitychange', handleResume);
        window.addEventListener('focus', handleResume);
        window.addEventListener('online', handleResume);

        return () => {
            document.removeEventListener('visibilitychange', handleResume);
            window.removeEventListener('focus', handleResume);
            window.removeEventListener('online', handleResume);
        };
    }, [socket]);

    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    );
};


/**
 * Resolves a human-friendly device name for the socket handshake,
 * preferring a locally stored override.
 *
 * @param {Object} [user] - The current user, if any.
 * @returns {string} A display name for this device.
 */
const getDeviceName = (user) => {
    const username = user?.username || user?.email?.split('@')[0] || 'My';
    return localStorage.getItem('device_name') || getFriendlyDeviceName(username);
};
