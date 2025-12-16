import React from 'react';
import PropTypes from 'prop-types';
import styles from './UploadProgress.module.css';

/**
 * Upload Progress Bar Component
 * @param {Object} props - Component props
 * @param {boolean} props.isUploading - Is currently uploading
 * @param {number} props.uploadProgress - Progress percentage
 * @param {number} props.uploadSpeed - Upload speed in MB/s
 * @param {number} props.uploadETA - ETA in seconds
 * @returns {JSX.Element} Rendered component
 */
const UploadProgress = ({ isUploading, uploadProgress, uploadSpeed, uploadETA }) => {
    return (
        <div className="w-100 mt-2">
            <div className="d-flex justify-content-between mb-1 small text-secondary fw-bold" style={{ fontSize: '0.75rem' }}>
                <span className={isUploading ? "text-primary" : "text-success"}>
                    {isUploading && uploadProgress === 100 ? "Processing..." : (isUploading ? "Uploading..." : "Upload Complete")}
                </span>
                <span>
                    {isUploading
                        ? (uploadProgress === 100 ? "Finalizing..." : `${uploadSpeed || 0} MB/s • ${uploadETA !== null ? (uploadETA > 60 ? `${Math.ceil(uploadETA / 60)}m` : `${uploadETA}s`) : '--'} remaining`)
                        : "Done"}
                </span>
            </div>
            <div className={`progress ${styles.storageProgressBar} rounded-pill`}>
                <div
                    className={`progress-bar rounded-pill ${isUploading ? 'progress-bar-striped progress-bar-animated bg-primary' : 'bg-success'}`}
                    role="progressbar"
                    style={{ width: `${uploadProgress}%` }}
                ></div>
            </div>
        </div>
    );
};

UploadProgress.propTypes = {
    isUploading: PropTypes.bool.isRequired,
    uploadProgress: PropTypes.number.isRequired,
    uploadSpeed: PropTypes.number,
    uploadETA: PropTypes.number,
};

export default UploadProgress;
