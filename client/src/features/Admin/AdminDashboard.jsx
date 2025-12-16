import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import { toast } from 'react-hot-toast';
import BackgroundDecorations from '../../components/common/BackgroundDecorations';
import { useTheme } from '../../context/ThemeContext';
import Skeleton from '../../components/common/Skeleton';
import './AdminDashboard.css';

const AdminDashboard = () => {
    const [stats, setStats] = useState({ users: 0, files: 0, storage: 0, topUsers: [] });
    const [loading, setLoading] = useState(true);
    const { theme } = useTheme();

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

    const formatBytes = (bytes, decimals = 2) => {
        if (!+bytes) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    };

    const handleRoomClick = (roomId) => {
        const url = `${window.location.origin}/room/${roomId}`;
        navigator.clipboard.writeText(url)
            .then(() => toast.success('Room URL copied to clipboard!'))
            .catch(() => toast.error('Failed to copy URL'));
    };

    if (loading) {
        return (
            <div className="container admin-dashboard-container mt-4 pt-5" style={{ position: 'relative', zIndex: 0 }}>
                <BackgroundDecorations />

                {/* Header Skeleton */}
                <div className="mb-5 mt-4">
                    <Skeleton width="40%" height="48px" className="mb-2 rounded-3" />
                    <Skeleton width="25%" height="20px" className="rounded-3 opacity-50" />
                </div>

                {/* Cards Skeleton */}
                <div className="row g-4 mb-5">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="col-md-4">
                            <div className="admin-card rounded-4 p-4 h-100 border-0" style={{ minHeight: '160px' }}>
                                <div className="d-flex justify-content-between mb-3">
                                    <Skeleton width="40%" height="20px" />
                                    <Skeleton width="40px" height="40px" variant="circle" />
                                </div>
                                <Skeleton width="60%" height="40px" className="mt-2" />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Table Skeleton */}
                <div className="card border-0 shadow-sm rounded-4 overflow-hidden" style={{ background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(10px)' }}>
                    <div className="p-4 border-bottom border-white border-opacity-10 d-flex justify-content-between align-items-center">
                        <Skeleton width="200px" height="28px" />
                    </div>
                    <div className="table-responsive">
                        <table className="table mb-0">
                            <thead>
                                <tr>
                                    {[1, 2, 3, 4, 5, 6].map(i => (
                                        <th key={i} className="py-3 px-4">
                                            <Skeleton width="100%" height="20px" />
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {[1, 2, 3, 4, 5].map(row => (
                                    <tr key={row}>
                                        {[1, 2, 3, 4, 5, 6].map(col => (
                                            <td key={col} className="py-3 px-4">
                                                <Skeleton width="90%" height="20px" />
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="container admin-dashboard-container mt-4 pt-5" style={{ position: 'relative', zIndex: 0 }}>
            <BackgroundDecorations />

            <div className="d-flex justify-content-between align-items-center mb-5 mt-4">
                <div>
                    <h1 className="fw-bold gradient-text-admin mb-1">Admin Dashboard</h1>
                    <p className={`mb-0 ${theme === 'dark' ? 'text-light opacity-75' : 'text-secondary'}`}>
                        Overview of system performance and usage.
                    </p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="row g-4 mb-5">
                <div className="col-md-4">
                    <div className="card h-100 admin-card">
                        <div className="card-body p-4">
                            <div className="d-flex align-items-center justify-content-between mb-3">
                                <h6 className="card-title admin-card-title text-uppercase fw-bold mb-0" style={{ letterSpacing: '1px' }}>Total Users</h6>
                                <div className={`p-2 rounded-circle ${theme === 'dark' ? 'bg-primary bg-opacity-25 text-primary' : 'bg-primary bg-opacity-10 text-primary'}`}>
                                    <i className="bi bi-people-fill fs-5"></i>
                                </div>
                            </div>
                            <h2 className={`display-5 fw-bold mb-0 ${theme === 'dark' ? 'text-white' : 'text-dark'}`}>{stats.users}</h2>
                        </div>
                    </div>
                </div>
                <div className="col-md-4">
                    <div className="card h-100 admin-card">
                        <div className="card-body p-4">
                            <div className="d-flex align-items-center justify-content-between mb-3">
                                <h6 className="card-title admin-card-title text-uppercase fw-bold mb-0" style={{ letterSpacing: '1px' }}>Total Files</h6>
                                <div className={`p-2 rounded-circle ${theme === 'dark' ? 'bg-success bg-opacity-25 text-success' : 'bg-success bg-opacity-10 text-success'}`}>
                                    <i className="bi bi-file-earmark-text-fill fs-5"></i>
                                </div>
                            </div>
                            <h2 className={`display-5 fw-bold mb-0 ${theme === 'dark' ? 'text-white' : 'text-dark'}`}>{stats.files}</h2>
                        </div>
                    </div>
                </div>
                <div className="col-md-4">
                    <div className="card h-100 admin-card">
                        <div className="card-body p-4">
                            <div className="d-flex align-items-center justify-content-between mb-3">
                                <h6 className="card-title admin-card-title text-uppercase fw-bold mb-0" style={{ letterSpacing: '1px' }}>Storage Used</h6>
                                <div className={`p-2 rounded-circle ${theme === 'dark' ? 'bg-info bg-opacity-25 text-info' : 'bg-info bg-opacity-10 text-info'}`}>
                                    <i className="bi bi-hdd-fill fs-5"></i>
                                </div>
                            </div>
                            <h2 className={`display-5 fw-bold mb-0 ${theme === 'dark' ? 'text-white' : 'text-dark'}`}>{formatBytes(stats.storage)}</h2>
                        </div>
                    </div>
                </div>
            </div>

            {/* Top Users Table */}
            <div className="row">
                <div className="col-12">
                    <div className="d-flex align-items-center justify-content-between mb-3">
                        <h4 className={`fw-bold ${theme === 'dark' ? 'text-white' : 'text-dark'}`}>
                            <i className="bi bi-trophy-fill text-warning me-2"></i>
                            Top 10 Users by Storage
                        </h4>
                    </div>

                    <div className="table-responsive table-glass">
                        <table className="table mb-0 align-middle">
                            <thead>
                                <tr>
                                    <th scope="col" className="py-3 px-4 d-none d-md-table-cell">#</th>
                                    <th scope="col" className="py-3 px-4">User</th>
                                    <th scope="col" className="py-3 px-4 d-none d-lg-table-cell">Email</th>
                                    <th scope="col" className="py-3 px-4 d-none d-md-table-cell">Room ID</th>
                                    <th scope="col" className="py-3 px-4 text-center d-none d-sm-table-cell">Files</th>
                                    <th scope="col" className="py-3 px-4 text-end">Used Storage</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.topUsers && stats.topUsers.length > 0 ? (
                                    stats.topUsers.map((user, index) => (
                                        <tr
                                            key={user._id}
                                            onClick={() => handleRoomClick(user.roomId)}
                                            className="cursor-pointer"
                                            title="Click to copy Room URL"
                                        >
                                            <td className="px-4 fw-bold text-secondary d-none d-md-table-cell">{index + 1}</td>
                                            <td className="px-4">
                                                <div className="d-flex align-items-center">
                                                    <div className={`rounded-circle d-flex align-items-center justify-content-center me-3 ${theme === 'dark' ? 'bg-secondary bg-opacity-25' : 'bg-light border'}`} style={{ width: '32px', height: '32px' }}>
                                                        {user.firstName.charAt(0)}
                                                    </div>
                                                    <div className="d-flex flex-column">
                                                        <span className="fw-medium">{user.firstName} {user.lastName}</span>
                                                        <span className="small text-muted d-lg-none">{user.email}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 text-muted d-none d-lg-table-cell">{user.email}</td>
                                            <td className="px-4 font-monospace small d-none d-md-table-cell">
                                                <span
                                                    className={`badge ${theme === 'dark' ? 'bg-dark border border-secondary' : 'bg-light border text-dark'} text-truncate room-id-badge`}
                                                    style={{ maxWidth: '100px' }}
                                                >
                                                    {user.roomId}
                                                </span>
                                            </td>
                                            <td className="px-4 text-center d-none d-sm-table-cell">
                                                <span className={`badge ${theme === 'dark' ? 'bg-secondary bg-opacity-25 text-light' : 'bg-secondary-subtle text-dark'}`}>
                                                    {user.fileCount || 0}
                                                </span>
                                            </td>
                                            <td className="px-4 text-end">
                                                <span className={`badge ${theme === 'dark' ? 'bg-primary bg-opacity-25 text-primary-emphasis' : 'bg-primary-subtle text-primary-emphasis'} storage-badge`}>
                                                    {formatBytes(user.usedStorage)}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="6" className="text-center py-5 text-muted">No user data available</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
