import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_BASE_URL from '../config';

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

    const login = (newToken, newRoomId) => {
        localStorage.setItem('token', newToken);
        localStorage.setItem('roomId', newRoomId);
        setToken(newToken);
        setRoomId(newRoomId);
        setUser({ isAuthenticated: true });
    };

    useEffect(() => {
        const verifyToken = async () => {
            const storedToken = localStorage.getItem('token');
            const storedRoomId = localStorage.getItem('roomId');

            if (storedToken) {
                try {
                    const res = await fetch(`${API_BASE_URL}/auth/verify`, {
                        headers: { 'x-auth-token': storedToken }
                    });

                    if (res.ok) {
                        setToken(storedToken);
                        setRoomId(storedRoomId);
                        setUser({ isAuthenticated: true });
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

    // Global Axios Interceptor for 401 Unauthorized
    useEffect(() => {
        const interceptor = axios.interceptors.response.use(
            (response) => response,
            (error) => {
                if (error.response && error.response.status === 401) {
                    logout();
                }
                return Promise.reject(error);
            }
        );

        return () => {
            axios.interceptors.response.eject(interceptor);
        };
    }, [logout]);

    return (
        <AuthContext.Provider value={{ user, token, roomId, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
