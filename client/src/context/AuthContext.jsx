/**
 * Preview: client/src/context/AuthContext.jsx
 * Description: Frontend application module.
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [roomId, setRoomId] = useState(localStorage.getItem('roomId'));
    const navigate = useNavigate();

    const logout = React.useCallback(async () => {
        try {
            await api.post('/auth/logout');
        } catch (error) {
            console.error('Logout request failed', error);
        }
        localStorage.removeItem('roomId');
        setIsAuthenticated(false);
        setRoomId(null);
        setUser(null);
        navigate('/', { replace: true });
    }, [navigate]);

    const login = (newRoomId, isAdmin) => {
        localStorage.setItem('roomId', newRoomId);
        setRoomId(newRoomId);
        setIsAuthenticated(true);
        setUser({ isAuthenticated: true, isAdmin: isAdmin });
    };

    useEffect(() => {
        const verifyToken = async () => {
            try {
                const res = await api.get('/auth/verify');

                if (res.status === 200 && res.data.success) {
                    setIsAuthenticated(true);
                    setUser(res.data.data.user);
                    if (res.data.data.user?.roomId) {
                        setRoomId(res.data.data.user.roomId);
                        localStorage.setItem('roomId', res.data.data.user.roomId);
                    }
                }
            } catch (error) {
                if (error.response?.status !== 401) {
                    console.error('Auth verification failed', error);
                }
                setIsAuthenticated(false);
                setUser(null);
            }
        };

        verifyToken();
    }, []);

    
    useEffect(() => {
        const interceptor = api.interceptors.response.use(
            (response) => response,
            (error) => {
                if (error.response && error.response.status === 401) {



                    if (!error.config.url.includes('/auth/login') && !error.config.url.includes('/auth/verify')) {
                        logout();
                    }
                }
                return Promise.reject(error);
            }
        );

        return () => {
            api.interceptors.response.eject(interceptor);
        };
    }, [logout]);

    return (
        <AuthContext.Provider value={{ user, isAuthenticated, roomId, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
