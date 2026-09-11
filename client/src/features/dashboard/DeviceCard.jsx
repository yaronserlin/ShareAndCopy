/**
 * Card for a single online device on the dashboard: file picker, send
 * button/progress bar, transfer stats, and an optional revoke action.
 */

import React from 'react';
import PropTypes from 'prop-types';

/**
 * @param {Object} props
 * @param {{deviceId: string, deviceName: string}} props.device
 * @param {File} [props.selectedFile] - File currently chosen to send to this device.
 * @param {Function} props.onFileChange - Called when a file is selected.
 * @param {Function} props.onSend - Called with the device ID to start a transfer.
 * @param {number} [props.transferProgress] - Send/receive progress percentage (0-100).
 * @param {{speed: string, eta: string}} [props.transferStats] - Current transfer speed/ETA.
 * @param {Function} [props.onRevoke] - Called with the device ID to revoke its access; omit to hide the action.
 * @returns {JSX.Element} The device card.
 */
const DeviceCard = ({ device, selectedFile, onFileChange, onSend, transferProgress, transferStats, onRevoke }) => {
    const isTransferred = transferProgress === 100;
    const isTransferring = transferProgress !== undefined && transferProgress < 100;

    return (
        <div className="card shadow-sm h-100 border-0">
            <div className="card-body p-4 text-center">
                <div className="mb-3">
                    <i className="bi bi-laptop display-1 text-primary"></i>
                </div>
                <h3 className="h5 fw-bold mb-1">{device.deviceName}</h3>
                <p className="text-muted small mb-4">ID: {device.deviceId}</p>

                <div className="mb-3">
                    <label htmlFor={`file-input-${device.deviceId}`} className="visually-hidden">
                        Select a file to send to {device.deviceName}
                    </label>
                    <input
                        id={`file-input-${device.deviceId}`}
                        type="file"
                        className="form-control form-control-sm"
                        onChange={(e) => onFileChange(e, device.deviceId)}
                    />
                </div>

                {isTransferring ? (
                    <div className="progress" style={{ height: '25px' }}>
                        <div
                            className="progress-bar progress-bar-striped progress-bar-animated"
                            role="progressbar"
                            style={{ width: `${transferProgress}%` }}
                            aria-valuenow={transferProgress}
                            aria-valuemin="0"
                            aria-valuemax="100"
                        >
                            {transferProgress}%
                        </div>
                    </div>
                ) : (
                    <button
                        className="btn btn-primary w-100 rounded-pill fw-bold"
                        onClick={() => onSend(device.deviceId)}
                        disabled={!selectedFile}
                    >
                        <i className="bi bi-send me-2"></i>
                        Send File
                    </button>
                )}

                {isTransferring && transferStats && (
                    <div className="d-flex justify-content-between text-muted small mt-1">
                        <span>{transferStats.speed}</span>
                        <span>ETA: {transferStats.eta}</span>
                    </div>
                )}

                {onRevoke && isTransferred === false && (
                    <button
                        className="btn btn-outline-danger w-100 rounded-pill mt-2 btn-sm"
                        onClick={() => onRevoke(device.deviceId)}
                    >
                        <i className="bi bi-x-circle me-1"></i> Revoke Access
                    </button>
                )}

                {isTransferred && (
                    <div className="mt-2 text-success small fw-bold">
                        <i className="bi bi-check-circle me-1"></i> Transfer Complete
                    </div>
                )}
            </div>
        </div>
    );
};

DeviceCard.propTypes = {
    device: PropTypes.shape({
        deviceId: PropTypes.string.isRequired,
        deviceName: PropTypes.string.isRequired,
    }).isRequired,
    selectedFile: PropTypes.object,
    onFileChange: PropTypes.func.isRequired,
    onSend: PropTypes.func.isRequired,
    onRevoke: PropTypes.func,
    transferProgress: PropTypes.number,
    transferStats: PropTypes.shape({ speed: PropTypes.string, eta: PropTypes.string }),
    isGuest: PropTypes.bool
};

export default DeviceCard;
