import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import api from '../../../utils/api';

/**
 * Custom hook for Admin Dashboard logic
 * @returns {Object} { stats, loading, handleRoomClick }
 */
export const useAdminDashboard = () => {
    const [stats, setStats] = useState({ users: 0, files: 0, storage: 0, topUsers: [] });
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

    const handleRoomClick = (roomId) => {
        const url = `${window.location.origin}/room/${roomId}`;
        navigator.clipboard.writeText(url)
            .then(() => toast.success('Room URL copied to clipboard!'))
            .catch(() => toast.error('Failed to copy URL'));
    };

    return { stats, loading, handleRoomClick };
};
