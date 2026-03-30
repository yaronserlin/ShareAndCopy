/**
 * Preview: client/src/context/SocketContext.jsx
 * Description: Frontend application module.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';
import { SERVER_URL } from '../config';
import { getFriendlyDeviceName } from '../utils/deviceUtils';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const { user, token, logout } = useAuth();

    useEffect(() => {
        if (!token) {
            if (socket) {
                socket.disconnect();
                setSocket(null);
            }
            return;
        }

        
        const newSocket = io(SERVER_URL, {
            auth: { token },
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
    }, [token]);

    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    );
};


const getDeviceId = () => {
    let deviceId = localStorage.getItem('device_id');
    if (!deviceId) {
        deviceId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        localStorage.setItem('device_id', deviceId);
    }
    return deviceId;
};


const getDeviceName = (user) => {
    const username = user?.username || user?.email?.split('@')[0] || 'My';
    return localStorage.getItem('device_name') || getFriendlyDeviceName(username);
};
