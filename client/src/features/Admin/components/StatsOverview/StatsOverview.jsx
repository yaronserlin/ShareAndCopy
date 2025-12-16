import React from 'react';
import PropTypes from 'prop-types';
import { useTheme } from '../../../../context/ThemeContext';
import styles from './StatsOverview.module.css';
import { formatBytes } from '../../../../utils/format';

/**
 * Stats Overview Component
 * Displays summary cards for Users, Files, and Storage.
 * @param {Object} props - Component props
 * @param {Object} props.stats - Stats object
 * @param {number} props.stats.users - Total users
 * @param {number} props.stats.files - Total files
 * @param {number} props.stats.storage - Total storage in bytes
 * @returns {JSX.Element} Rendered component
 */
const StatsOverview = ({ stats }) => {
    const { theme } = useTheme();

    return (
        <div className="row g-4 mb-5">
            <div className="col-md-4">
                <div className={`card h-100 ${styles.adminCard}`}>
                    <div className="card-body p-4">
                        <div className="d-flex align-items-center justify-content-between mb-3">
                            <h6 className={`card-title text-uppercase fw-bold mb-0 ${styles.cardTitle}`}>Total Users</h6>
                            <div className={`p-2 rounded-circle ${theme === 'dark' ? 'bg-primary bg-opacity-25 text-primary' : 'bg-primary bg-opacity-10 text-primary'}`}>
                                <i className="bi bi-people-fill fs-5"></i>
                            </div>
                        </div>
                        <h2 className={`display-5 fw-bold mb-0 ${theme === 'dark' ? 'text-white' : 'text-dark'}`}>{stats.users}</h2>
                    </div>
                </div>
            </div>
            <div className="col-md-4">
                <div className={`card h-100 ${styles.adminCard}`}>
                    <div className="card-body p-4">
                        <div className="d-flex align-items-center justify-content-between mb-3">
                            <h6 className={`card-title text-uppercase fw-bold mb-0 ${styles.cardTitle}`}>Total Files</h6>
                            <div className={`p-2 rounded-circle ${theme === 'dark' ? 'bg-success bg-opacity-25 text-success' : 'bg-success bg-opacity-10 text-success'}`}>
                                <i className="bi bi-file-earmark-text-fill fs-5"></i>
                            </div>
                        </div>
                        <h2 className={`display-5 fw-bold mb-0 ${theme === 'dark' ? 'text-white' : 'text-dark'}`}>{stats.files}</h2>
                    </div>
                </div>
            </div>
            <div className="col-md-4">
                <div className={`card h-100 ${styles.adminCard}`}>
                    <div className="card-body p-4">
                        <div className="d-flex align-items-center justify-content-between mb-3">
                            <h6 className={`card-title text-uppercase fw-bold mb-0 ${styles.cardTitle}`}>Storage Used</h6>
                            <div className={`p-2 rounded-circle ${theme === 'dark' ? 'bg-info bg-opacity-25 text-info' : 'bg-info bg-opacity-10 text-info'}`}>
                                <i className="bi bi-hdd-fill fs-5"></i>
                            </div>
                        </div>
                        <h2 className={`display-5 fw-bold mb-0 ${theme === 'dark' ? 'text-white' : 'text-dark'}`}>{formatBytes(stats.storage)}</h2>
                    </div>
                </div>
            </div>
        </div>
    );
};

StatsOverview.propTypes = {
    stats: PropTypes.shape({
        users: PropTypes.number.isRequired,
        files: PropTypes.number.isRequired,
        storage: PropTypes.number.isRequired,
    }).isRequired,
};

export default StatsOverview;
