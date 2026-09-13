/**
 * Route guard restricting nested routes to authenticated users.
 */

import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Redirects unauthenticated users to `/login`, otherwise renders the
 * matched nested route via {@link Outlet}. Waits for the initial session
 * check (`isLoading`) to settle before deciding, so a valid session isn't
 * bounced to `/login` while the cookie is still being verified on first
 * load.
 *
 * @returns {JSX.Element} A redirect, a loading placeholder, or the route outlet.
 */
const RequireAuth = () => {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return <div>Loading...</div>;
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
};

export default RequireAuth;
