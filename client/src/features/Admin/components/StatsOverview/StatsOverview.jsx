import React from 'react';
import PropTypes from 'prop-types';
import styles from './StatsOverview.module.css';
import StatsCard from './StatsCard';
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

    return (
        <div className="row g-4 mb-5">
            <div className="col-md-4">
                <StatsCard
                    title="Registered Users"
                    value={stats.users}
                    icon="bi-people-fill"
                    iconColorClass="bg-primary text-primary"
                />
            </div>
            <div className="col-md-4">
                <StatsCard
                    title="Guest Sessions"
                    value={stats.guests}
                    icon="bi-incognito"
                    iconColorClass="bg-info text-info"
                />
            </div>
            <div className="col-md-4">
                <StatsCard
                    title="Data Transferred"
                    value={formatBytes(stats.dataTransferred)}
                    icon="bi-hdd-network"
                    iconColorClass="bg-success text-success"
                />
            </div>
        </div>
    );
};

StatsOverview.propTypes = {
    stats: PropTypes.shape({
        users: PropTypes.number.isRequired,
        guests: PropTypes.number.isRequired,
        dataTransferred: PropTypes.number.isRequired,
    }).isRequired,
};

export default StatsOverview;
