import React, { useState } from 'react';
import { useP2P } from '../../hooks/useP2P';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import API_BASE_URL from '../../config';
import DevicePairing from '../../components/DevicePairing';
import DeviceCard from './DeviceCard';
// import styles from './Dashboard.module.css'; // Removed unused missing CSS

const Dashboard = () => {
    const { user } = useAuth();
    const { onlineDevices, transferProgress, transferStats, sendFile, pendingTransfers, acceptTransfer, rejectTransfer } = useP2P();
    const [selectedFiles, setSelectedFiles] = useState({}); // { deviceId: File }
    const [showPairingModal, setShowPairingModal] = useState(false);

    const handleFileChange = (e, deviceId) => {
        if (e.target.files[0]) {
            setSelectedFiles(prev => ({ ...prev, [deviceId]: e.target.files[0] }));
        }
    };

    const handleSend = (deviceId) => {
        const file = selectedFiles[deviceId];
        if (file) {
            sendFile(file, deviceId);
            // Optional: Clear selection after send starts or keep it?
            // setSelectedFiles(prev => { const n = {...prev}; delete n[deviceId]; return n; });
        }
    };

    const handleRevoke = async (deviceId) => {
        if (!window.confirm('Are you sure you want to revoke this device? It will be disconnected immediately.')) return;

        try {
            await axios.post(`${API_BASE_URL}/auth/revoke`, { deviceId }, {
                headers: { 'x-auth-token': localStorage.getItem('token') }
            });
            // UI update will happen automatically via socket 'device-offline' event
        } catch (err) {
            console.error('Revocation failed', err);
            alert('Failed to revoke device');
        }
    };

    return (
        <div className="container py-5 mt-5">
            <header className="mb-5 text-center position-relative">
                <h1 className="display-4 fw-bold">My Devices</h1>
                {/* Desktop Button - Hide for Guests */}
                {!user?.isGuest && (
                    <button
                        className="btn btn-outline-primary position-absolute top-0 end-0 mt-2 hover-scale d-none d-md-inline-flex align-items-center"
                        onClick={() => setShowPairingModal(true)}
                    >
                        <i className="bi bi-qr-code-scan me-2"></i>
                        Add Device
                    </button>
                )}

                <p className="lead text-muted">Directly transfer files between your authorized devices.</p>

                {/* Mobile Button - Hide for Guests */}
                {!user?.isGuest && (
                    <div className="d-md-none mt-4">
                        <button
                            className="btn btn-outline-primary w-100 rounded-pill py-2 shadow-sm"
                            onClick={() => setShowPairingModal(true)}
                        >
                            <i className="bi bi-qr-code-scan me-2"></i>
                            Add Device
                        </button>
                    </div>
                )}
            </header>

            <DevicePairing show={showPairingModal} onHide={() => setShowPairingModal(false)} />

            <div className="row g-4 justify-content-center">
                {onlineDevices.length === 0 ? (
                    <div className="col-12 text-center">
                        <div className="alert alert-info d-inline-block">
                            <i className="bi bi-info-circle me-2"></i>
                            No other devices online. Open this app on another device to start sharing.
                        </div>
                    </div>
                ) : (
                    onlineDevices.map(device => (
                        <div key={device.deviceId} className="col-12 col-md-6 col-lg-4">
                            <DeviceCard
                                device={device}
                                selectedFile={selectedFiles[device.deviceId]}
                                onFileChange={handleFileChange}
                                onSend={handleSend}
                                transferProgress={transferProgress[device.deviceId]}
                                transferStats={transferStats?.[device.deviceId]}
                                onRevoke={!user?.isGuest ? handleRevoke : null}
                            />
                        </div>
                    ))
                )}
            </div>

            {/* Incoming File Confirmation Modals */}
            {Object.entries(pendingTransfers).map(([deviceId, transfer]) => (
                <div className="modal show d-block" tabIndex="-1" key={deviceId} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 shadow-lg">
                            <div className="modal-header bg-primary text-white border-bottom-0">
                                <h5 className="modal-title fw-bold">
                                    <i className="bi bi-cloud-download me-2"></i>
                                    Incoming File Request
                                </h5>
                            </div>
                            <div className="modal-body p-4 text-center">
                                <div className="mb-3">
                                    <i className="bi bi-file-earmark-text display-1 text-primary"></i>
                                </div>
                                <h6 className="fw-bold mb-1">{transfer.fileName}</h6>
                                <p className="text-muted small mb-3">{(transfer.fileSize / 1024 / 1024).toFixed(2)} MB</p>
                                <p className="mb-0">
                                    From <strong>{transfer.deviceName}</strong>
                                </p>
                            </div>
                            <div className="modal-footer border-top-0 justify-content-center pb-4">
                                <button className="btn btn-outline-secondary rounded-pill px-4" onClick={() => rejectTransfer(deviceId)}>
                                    Decline
                                </button>
                                <button className="btn btn-primary rounded-pill px-4 fw-bold" onClick={() => acceptTransfer(deviceId)}>
                                    Accept & Download
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default Dashboard;
