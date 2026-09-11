/**
 * Socket.IO connection context: opens an authenticated socket while the
 * user is signed in, tears it down on sign-out, and forces a logout if
 * the server reports the session's token as invalid or revoked.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';
import { SERVER_URL } from '../config';
import { getFriendlyDeviceName, getDeviceId } from '../utils/deviceUtils';

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
