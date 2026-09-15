/**
 * Preview: client/src/context/__tests__/AuthContext.test.jsx
 * Description: Session survival rules - only the server ends a session, never a flaky network.
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../../utils/api', () => {
    const api = {
        get: vi.fn(),
        post: vi.fn().mockResolvedValue({ data: {} }),
        patch: vi.fn(),
        interceptors: {
            request: { use: vi.fn() },
            response: { use: vi.fn(), eject: vi.fn() }
        }
    };

    return {
        default: api,
        ensureFreshAccessToken: vi.fn().mockResolvedValue(true)
    };
});

import api from '../../utils/api';
import { AuthProvider, useAuth } from '../AuthContext';
import { setRefreshToken, setCachedUser, getRefreshToken } from '../../utils/tokenStore';

/** Surfaces the pieces of auth state under test. */
const Probe = () => {
    const { isAuthenticated, isOffline, isLoading } = useAuth();

    return (
        <div>
            <span data-testid="authenticated">{String(isAuthenticated)}</span>
            <span data-testid="offline">{String(isOffline)}</span>
            <span data-testid="loading">{String(isLoading)}</span>
        </div>
    );
};

const renderAuth = () => render(
    <MemoryRouter>
        <AuthProvider>
            <Probe />
        </AuthProvider>
    </MemoryRouter>
);

/** An axios error with no response, i.e. the request never reached the server. */
const networkError = () => Object.assign(new Error('Network Error'), { response: undefined });

/** An axios error the API client has marked as a definitively dead session. */
const expiredSessionError = () => Object.assign(new Error('Unauthorized'), {
    response: { status: 401 },
    isSessionExpired: true
});

describe('AuthContext session handling', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
    });

    it('keeps a stored session when the server cannot be reached', async () => {
        setRefreshToken('stored-refresh-token');
        setCachedUser({ isAdmin: false, roomId: 'room-1' });
        api.get.mockRejectedValue(networkError());

        renderAuth();

        await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));

        // The whole point: an unreachable server is a temporary state,
        // not the end of the session.
        expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
        expect(screen.getByTestId('offline')).toHaveTextContent('true');
        expect(getRefreshToken()).toBe('stored-refresh-token');
    });

    it('signs out when the server rejects the session', async () => {
        setRefreshToken('stale-refresh-token');
        setCachedUser({ isAdmin: false, roomId: 'room-1' });
        api.get.mockRejectedValue(expiredSessionError());

        renderAuth();

        await waitFor(() => expect(screen.getByTestId('authenticated')).toHaveTextContent('false'));

        expect(getRefreshToken()).toBeNull();
        expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    });

    it('restores the session from the stored refresh token on launch', async () => {
        setRefreshToken('stored-refresh-token');
        api.get.mockResolvedValue({
            status: 200,
            data: { success: true, data: { user: { roomId: 'room-1', isGuest: false } } }
        });

        renderAuth();

        await waitFor(() => expect(screen.getByTestId('authenticated')).toHaveTextContent('true'));
        expect(screen.getByTestId('offline')).toHaveTextContent('false');
        expect(api.get).toHaveBeenCalledWith('/auth/verify');
    });

    it('starts signed out when there is nothing stored to restore', async () => {
        renderAuth();

        await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));

        expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
        expect(api.get).not.toHaveBeenCalled();
    });

    it('ends the session when the API client reports it as expired', async () => {
        setRefreshToken('stored-refresh-token');
        api.get.mockResolvedValue({
            status: 200,
            data: { success: true, data: { user: { roomId: 'room-1' } } }
        });

        renderAuth();
        await waitFor(() => expect(screen.getByTestId('authenticated')).toHaveTextContent('true'));

        act(() => {
            window.dispatchEvent(new CustomEvent('auth:session-expired', { detail: { reason: 'token_revoked' } }));
        });

        await waitFor(() => expect(screen.getByTestId('authenticated')).toHaveTextContent('false'));
        expect(getRefreshToken()).toBeNull();
    });

    it('marks the app offline when the API client reports the server unreachable', async () => {
        setRefreshToken('stored-refresh-token');
        api.get.mockResolvedValue({
            status: 200,
            data: { success: true, data: { user: { roomId: 'room-1' } } }
        });

        renderAuth();
        await waitFor(() => expect(screen.getByTestId('authenticated')).toHaveTextContent('true'));

        act(() => {
            window.dispatchEvent(new CustomEvent('auth:session-degraded', { detail: { reason: 'refresh_unreachable' } }));
        });

        await waitFor(() => expect(screen.getByTestId('offline')).toHaveTextContent('true'));
        expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
    });
});
