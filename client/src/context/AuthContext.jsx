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


                    // axios response.status is checked, but api.get throws on 4xx usually unless we catch it.
                    // However, we are in a try block. If api.get succeeds, it means 2xx.
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

    // Interceptor for 401 Unauthorized on the API instance
    useEffect(() => {
        const interceptor = api.interceptors.response.use(
            (response) => response,
            (error) => {
                if (error.response && error.response.status === 401) {
                    // Don't logout if the 401 is from the login endpoint
                    // This allows the login form to handle the error (show "Wrong password")
                    // without redirecting the user.
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
