import React from 'react';
import PropTypes from 'prop-types';
import QRCode from 'react-qr-code';
import styles from './RoomTitle.module.css';

/**
 * Room Title and Basic Info Component
 * @param {Object} props - Component props
 * @param {Object} props.ownerName - Owner object { firstName, lastName }
 * @param {string} props.roomId - The Room ID
 * @param {string} props.roomUrl - The Room URL
 * @param {Function} props.onCopyUrl - Handler to copy URL
 * @param {Function} props.onShowQR - Handler to show QR modal
 * @returns {JSX.Element} Rendered component
 */
const RoomTitle = ({ ownerName, roomId, roomUrl, onCopyUrl, onShowQR }) => {
    return (
        <div className="d-flex justify-content-between align-items-center w-100">
            <div>
                <h1 className="h3 fw-bold mb-1 text-primary text-capitalize">
                    {ownerName?.firstName && ownerName?.lastName
                        ? `${ownerName.firstName} ${ownerName.lastName}'s Room`
                        : 'My Room'}
                </h1>
                {/* Room ID with Copy */}
                <div
                    className={`${styles.copyContainer} d-flex align-items-center gap-2 text-secondary small cursor-pointer hover-opacity`}
                    onClick={onCopyUrl}
                    title="Click to copy Room Link"
                >
                    <span className="fw-bold text-uppercase tracking-wider opacity-75" style={{ fontSize: '0.7rem' }}>ID:</span>
                    <span className="font-monospace user-select-all">{roomId}</span>
                    <i className="bi bi-copy ms-1 opacity-50"></i>
                </div>
            </div>

            {/* QR Code Trigger */}
            <div
                className={`${styles.headerQrCode} shadow-sm cursor-pointer bg-white p-1 rounded`}
                onClick={onShowQR}
                title="Show QR Code"
            >
                <QRCode value={roomUrl} size={40} style={{ height: "40px", width: "40px" }} />
            </div>
        </div>
    );
};

RoomTitle.propTypes = {
    ownerName: PropTypes.shape({
        firstName: PropTypes.string,
        lastName: PropTypes.string,
    }),
    roomId: PropTypes.string.isRequired,
    roomUrl: PropTypes.string.isRequired,
    onCopyUrl: PropTypes.func.isRequired,
    onShowQR: PropTypes.func.isRequired,
};

export default RoomTitle;
