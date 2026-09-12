/**
 * Socket.IO connection context: opens an authenticated socket while the
 * user is signed in, tears it down on sign-out, and forces a logout if
 * the server reports the session's token as invalid or revoked.
 *
 * Authenticates via `auth.token` (the in-memory access token) rather
 * than `withCredentials`/cookies alone: client and server are separate
 * origins here, and a browser blocking third-party cookies would never
 * deliver the `token` cookie to the socket handshake, even though the
 * server's `io.use` middleware already accepts it as a fallback.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';
import { SERVER_URL } from '../config';
import { getFriendlyDeviceName, getDeviceId } from '../utils/deviceUtils';
import { getAccessToken } from '../utils/tokenStore';

const SocketContext = createContext();

/** @returns {import('socket.io-client').Socket|null} The shared socket, or `null` if not connected. */
export const useSocket = () => useContext(SocketContext);

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

    useEffect(() => {
        if (!isAuthenticated) {
            if (socket) {
                socket.disconnect();
                setSocket(null);
            }
            return;
        }

        const newSocket = io(SERVER_URL, {
            withCredentials: true,
            auth: {
                token: getAccessToken()
            },
            query: {
                deviceId: getDeviceId(),
                deviceName: getDeviceName(user)
            }
        });

        newSocket.on('connect', () => {
            console.log('Socket connected:', newSocket.id);
        });

        newSocket.on('connect_error', (err) => {
            console.error('Socket connection error:', err);
            if (err.message === 'Authentication error: Token revoked' ||
                err.message === 'Authentication error: Invalid token' ||
                err.message === 'Authentication error: User not found') {
                console.warn('Critical Socket Error -> Logging out');
                logout();
            }
        });

        newSocket.on('force-logout', () => {
            console.warn('Server forced logout -> Logging out');
            logout();
        });

        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
        };
    }, [isAuthenticated]);

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
