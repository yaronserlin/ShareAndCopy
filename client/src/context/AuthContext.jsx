/**
 * Authentication context: tracks the signed-in user, re-establishes the
 * session on mount (exposing `isLoading` until that settles), and
 * installs an axios interceptor that logs the user out on a 401
 * response from any endpoint other than login/verify/logout/refresh.
 *
 * Session bootstrap uses the persisted refresh token rather than the
 * `token`/`refreshToken` cookies alone: client and server are separate
 * origins here, and browsers that block third-party cookies won't
 * reliably keep or return a `SameSite=None` cookie across a reload, even
 * though it's set correctly server-side.
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { refreshAccessToken } from '../utils/api';
import { getAccessToken, getRefreshToken, setAccessToken, setRefreshToken, clearTokens } from '../utils/tokenStore';

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
    const [isLoading, setIsLoading] = useState(true);
    const [roomId, setRoomId] = useState(localStorage.getItem('roomId'));
    const navigate = useNavigate();

    const loggingOutRef = React.useRef(false);

    /**
     * Logs the current user out: notifies the server, clears local auth
     * state, and redirects to the home page. Reentrant calls (e.g. a
     * logout button click racing a 401-triggered auto-logout) are
     * ignored while one is already in flight.
     *
     * @returns {Promise<void>}
     */
    const logout = React.useCallback(async () => {
        if (loggingOutRef.current) return;
        loggingOutRef.current = true;

        try {
            await api.post('/auth/logout');
        } catch (error) {
            console.error('Logout request failed', error);
        }
        localStorage.removeItem('roomId');
        clearTokens();
        setIsAuthenticated(false);
        setRoomId(null);
        setUser(null);
        navigate('/', { replace: true });
        loggingOutRef.current = false;
    }, [navigate]);

    /**
     * Marks the user as authenticated, persists their room ID, and
     * stores the issued tokens (access token in memory, refresh token in
     * `localStorage`) so the session survives a reload.
     *
     * @param {string} newRoomId - Room ID assigned to the authenticated user.
     * @param {boolean} isAdmin - Whether the user has admin privileges.
     * @param {string} [accessToken] - Access token issued for this session.
     * @param {string} [refreshToken] - Refresh token issued for this session, if any (guest sessions have none).
     * @param {boolean} [isGuest] - Whether this is an ephemeral paired-device guest session, not a full account.
     */
    const login = (newRoomId, isAdmin, accessToken, refreshToken, isGuest = false) => {
        localStorage.setItem('roomId', newRoomId);
        if (accessToken) setAccessToken(accessToken);
        if (refreshToken) setRefreshToken(refreshToken);
        setRoomId(newRoomId);
        setIsAuthenticated(true);
        setUser({ isAuthenticated: true, isAdmin: isAdmin, isGuest });
    };

    useEffect(() => {
        const verifyToken = async () => {
            try {
                if (!getAccessToken() && getRefreshToken()) {
                    try {
                        await refreshAccessToken();
                    } catch {
                        clearTokens();
                    }
                }

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
            } finally {
                setIsLoading(false);
            }
        };

        verifyToken();
    }, []);

    useEffect(() => {
        const interceptor = api.interceptors.response.use(
            (response) => response,
            (error) => {
                if (error.response && error.response.status === 401) {
                    const url = error.config?.url || '';
                    const isExemptEndpoint = url.includes('/auth/login') ||
                        url.includes('/auth/verify') ||
                        url.includes('/auth/logout') ||
                        url.includes('/auth/refresh');

                    if (!isExemptEndpoint) {
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
        <AuthContext.Provider value={{ user, isAuthenticated, isLoading, roomId, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

/** @returns {Object} The current auth context value (user, state, actions). */
export const useAuth = () => useContext(AuthContext);
