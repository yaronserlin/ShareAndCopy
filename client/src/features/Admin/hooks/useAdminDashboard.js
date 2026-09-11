/**
 * Hook that fetches admin dashboard statistics on mount.
 */

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import api from '../../../utils/api';

/**
 * Fetches system-wide stats from `GET /admin/stats` on mount.
 *
 * @returns {{stats: {users: number, devices: number, topUsers: Array}, loading: boolean}}
 */
export const useAdminDashboard = () => {
    const [stats, setStats] = useState({ users: 0, devices: 0, topUsers: [] });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await api.get('/admin/stats');
                if (res.data.success) {
                    setStats(res.data.data);
                }
            } catch (error) {
                console.error('Failed to fetch admin stats', error);
                toast.error('Failed to load dashboard statistics');
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    return { stats, loading };
};
