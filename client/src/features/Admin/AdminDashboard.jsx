/**
 * Admin-only dashboard summarizing system usage: user/guest counts, total
 * data transferred, and a leaderboard of the most active users.
 */

import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import StatsOverview from './components/StatsOverview/StatsOverview';
import UsersTable from './components/UsersTable/UsersTable';
import AdminDashboardSkeleton from './components/AdminSkeleton/AdminDashboardSkeleton';
import { useAdminDashboard } from './hooks/useAdminDashboard';
import styles from './AdminDashboard.module.css';

/**
 * Renders the admin dashboard, showing a loading skeleton until stats
 * have been fetched.
 *
 * @returns {JSX.Element} The admin dashboard page.
 */
const AdminDashboard = () => {
    const { stats, loading } = useAdminDashboard();
    const { theme } = useTheme();

    if (loading) {
        return <AdminDashboardSkeleton />;
    }

    return (
        <div className={`container mt-5 pt-5 ${styles.adminDashboardContainer}`} style={{ position: 'relative', zIndex: 0 }}>

            <div className="d-flex justify-content-between align-items-center mb-5 mt-4">
                <div>
                    <h1 className={`fw-bold mb-1 ${styles.gradientTextAdmin}`}>Admin Dashboard</h1>
                    <p className={`mb-0 ${theme === 'dark' ? 'text-light opacity-75' : 'text-secondary'}`}>
                        Overview of system performance and usage.
                    </p>
                </div>
            </div>

            <StatsOverview stats={stats} />

            <UsersTable users={stats.topUsers} />
        </div>
    );
};

export default AdminDashboard;
