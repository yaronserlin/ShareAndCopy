/**
 * Route guard restricting nested routes to authenticated users.
 */

import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Redirects unauthenticated users to `/login`, otherwise renders the
 * matched nested route via {@link Outlet}.
 *
 * A session restored from storage renders immediately, while the check
 * that confirms it with the server runs in the background - relaunching
 * the installed app shouldn't mean staring at a spinner, and if the
 * server does reject the session the user is signed out then. The
 * placeholder is only for the case where there is nothing stored to go
 * on yet.
 *
 * @returns {JSX.Element} A redirect, a loading placeholder, or the route outlet.
 */
const RequireAuth = () => {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading && !isAuthenticated) {
        return <div>Loading...</div>;
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
};

export default RequireAuth;
