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
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [roomId, setRoomId] = useState(localStorage.getItem('roomId'));
    const navigate = useNavigate();

    const logout = React.useCallback(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('roomId');
        setToken(null);
        setRoomId(null);
        setUser(null);
        navigate('/', { replace: true });
    }, [navigate]);

    const login = (newToken, newRoomId, isAdmin) => {
        localStorage.setItem('token', newToken);
        localStorage.setItem('roomId', newRoomId);
        setToken(newToken);
        setRoomId(newRoomId);
        setUser({ isAuthenticated: true, isAdmin: isAdmin });
    };

    useEffect(() => {
        const verifyToken = async () => {
            const storedToken = localStorage.getItem('token');
            const storedRoomId = localStorage.getItem('roomId');

            if (storedToken) {
                try {
                    const res = await api.get('/auth/verify');


                    
                    
                    if (res.status === 200 && res.data.success) {
                        setToken(storedToken);
                        setRoomId(storedRoomId);
                        setUser(res.data.data.user || { isAuthenticated: true, isAdmin: res.data.data.user?.isAdmin });
                    } else {
                        logout();
                    }
                } catch (error) {
                    console.error('Auth verification failed', error);
                    logout();
                }
            }
        };

        verifyToken();
    }, [logout]);

    
    useEffect(() => {
        const interceptor = api.interceptors.response.use(
            (response) => response,
            (error) => {
                if (error.response && error.response.status === 401) {
                    
                    
                    
                    if (!error.config.url.includes('/auth/login')) {
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
        <AuthContext.Provider value={{ user, token, roomId, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
