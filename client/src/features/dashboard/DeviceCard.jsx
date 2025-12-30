import React from 'react';
import PropTypes from 'prop-types';

const DeviceCard = ({ device, selectedFile, onFileChange, onSend, transferProgress }) => {
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

                {/* File Selection */}
                <div className="mb-3">
                    <input
                        type="file"
                        className="form-control form-control-sm"
                        onChange={(e) => onFileChange(e, device.deviceId)}
                    />
                </div>

                {/* Transfer Progress or Send Button */}
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
    transferProgress: PropTypes.number,
};

export default DeviceCard;
