import React from 'react';
import PropTypes from 'prop-types';
import { useTheme } from '../../../../context/ThemeContext';
import styles from '../../components/StatsOverview/StatsOverview.module.css';

const StatsCard = ({ title, value, icon, iconColorClass, textColorClass = null }) => {
    const { theme } = useTheme();

    // Determine value color based on theme if not provided
    const valueColor = textColorClass || (theme === 'dark' ? 'text-white' : 'text-dark');

    // Determine icon container class based on theme and input
    const iconContainerClass = `p-2 rounded-circle ${theme === 'dark'
        ? `${iconColorClass} bg-opacity-25`
        : `${iconColorClass} bg-opacity-10`}`;

    return (
        <div className={`card h-100 ${styles.adminCard}`}>
            <div className="card-body p-4">
                <div className="d-flex align-items-center justify-content-between mb-3">
                    <h6 className={`card-title text-uppercase fw-bold mb-0 ${styles.cardTitle}`}>{title}</h6>
                    <div className={iconContainerClass}>
                        <i className={`bi ${icon} fs-5`}></i>
                    </div>
                </div>
                <h2 className={`display-5 fw-bold mb-0 ${valueColor}`}>{value}</h2>
            </div>
        </div>
    );
};

StatsCard.propTypes = {
    title: PropTypes.string.isRequired,
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    icon: PropTypes.string.isRequired,
    iconColorClass: PropTypes.string.isRequired, // e.g., 'bg-primary text-primary'
    textColorClass: PropTypes.string
};

export default StatsCard;
