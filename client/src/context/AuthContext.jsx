/**
 * Authentication context: tracks the signed-in user, verifies the
 * session cookie on mount, and installs an axios interceptor that logs
 * the user out on a 401 response from any endpoint other than login/verify.
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const AuthContext = createContext(null);

/**
 * Provides authentication state and actions to descendant components.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @returns {JSX.Element} The context provider wrapping `children`.
 */
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [roomId, setRoomId] = useState(localStorage.getItem('roomId'));
    const navigate = useNavigate();

    /**
     * Logs the current user out: notifies the server, clears local auth
     * state, and redirects to the home page.
     *
     * @returns {Promise<void>}
     */
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

    /**
     * Marks the user as authenticated and persists their room ID.
     *
     * @param {string} newRoomId - Room ID assigned to the authenticated user.
     * @param {boolean} isAdmin - Whether the user has admin privileges.
     */
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

/** @returns {Object} The current auth context value (user, state, actions). */
export const useAuth = () => useContext(AuthContext);
