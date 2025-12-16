import React from 'react';
import PropTypes from 'prop-types';
import { formatBytes } from '../../../../../../utils/format';
import styles from './StorageBar.module.css';

/**
 * Storage Usage Bar Component
 * @param {Object} props - Component props
 * @param {number} props.usedStorage - Used storage in bytes
 * @param {number} props.maxStorage - Max storage in bytes
 * @returns {JSX.Element} Rendered component
 */
const StorageBar = ({ usedStorage, maxStorage }) => {
    const percentage = Math.min(100, (usedStorage / maxStorage) * 100);
    const isFull = usedStorage > (maxStorage * 0.9);

    return (
        <div className="w-100">
            <div className="d-flex justify-content-between mb-1 small text-secondary fw-bold" style={{ fontSize: '0.75rem' }}>
                <span>Storage Used</span>
                <span>{formatBytes(usedStorage)} / {formatBytes(maxStorage)}</span>
            </div>
            <div className={`progress ${styles.storageProgressBar} rounded-pill`}>
                <div
                    className={`progress-bar rounded-pill ${isFull ? 'bg-danger' : 'bg-primary'}`}
                    role="progressbar"
                    style={{ width: `${percentage}%` }}
                ></div>
            </div>
        </div>
    );
};

StorageBar.propTypes = {
    usedStorage: PropTypes.number.isRequired,
    maxStorage: PropTypes.number.isRequired,
};

export default StorageBar;
