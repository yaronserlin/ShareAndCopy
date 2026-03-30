/**
 * Preview: client/src/components/AdminRoute.jsx
 * Description: Frontend application module.
 */

import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AdminRoute = () => {
    const { user, token } = useAuth();

    
    
    

    
    
    

    if (!token) {
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
