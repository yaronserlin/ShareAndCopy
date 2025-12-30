import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';
import { SERVER_URL } from '../config';
import { getFriendlyDeviceName } from '../utils/deviceUtils';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const { user, token } = useAuth();

    useEffect(() => {
        if (!token) {
            if (socket) {
                socket.disconnect();
                setSocket(null);
            }
            return;
        }

        // Initialize Socket with Token
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

// Helper to get or generate a persistent Device ID
const getDeviceId = () => {
    let deviceId = localStorage.getItem('device_id');
    if (!deviceId) {
        deviceId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        localStorage.setItem('device_id', deviceId);
    }
    return deviceId;
};

// Helper for Device Name
const getDeviceName = (user) => {
    const username = user?.username || user?.email?.split('@')[0] || 'My';
    return localStorage.getItem('device_name') || getFriendlyDeviceName(username);
};
