/**
 * Route guard restricting nested routes to authenticated administrators.
 */

import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Redirects unauthenticated users to `/login` and non-admin users to `/`,
 * otherwise renders the matched nested route via {@link Outlet}.
 *
 * @returns {JSX.Element} A redirect, a loading placeholder, or the route outlet.
 */
const AdminRoute = () => {
    const { user, isAuthenticated } = useAuth();

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (user && !user.isAdmin) {
        return <Navigate to="/" replace />;
    }

    if (!user) {
        return <div>Loading...</div>;
    }

    return <Outlet />;
};

export default AdminRoute;
