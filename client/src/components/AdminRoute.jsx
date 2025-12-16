import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AdminRoute = () => {
    const { user, token } = useAuth();

    // If waiting for user data to load, you might want to show a spinner here
    // But for now, if no token, redirect. If token but no user yet, it might flicker or we should wait.
    // Assuming 'user' is populated quickly after mount via 'verifyToken' if token exists.

    // Better check: If we have a token but user is null, we are "loading" or "verifying". 
    // However, AuthContext sets user initially to null. 
    // Let's rely on token presence for redirecting to login, and user.isAdmin for redirecting to home.

    if (!token) {
        return <Navigate to="/login" replace />;
    }

    if (user && !user.isAdmin) {
        return <Navigate to="/" replace />;
    }

    // If user is null but token exists, we are likely loading. 
    // Ideally AuthContext should expose 'loading' state.
    // For simplicity, if user is not loaded yet, we can render nothing or a spinner.
    if (!user) {
        return <div>Loading...</div>; // Or return null
    }

    return <Outlet />;
};

export default AdminRoute;
