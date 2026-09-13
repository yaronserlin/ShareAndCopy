/**
 * Authenticated user's device dashboard: lists their other online
 * devices, lets them pick and send a file to each, and shows incoming
 * transfer requests and device-revocation confirmations as modals.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Button } from 'react-bootstrap';
import toast from 'react-hot-toast';
import { useP2P } from '../../hooks/useP2P';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import DevicePairing from '../../components/DevicePairing';
import DeviceCard from './DeviceCard';

/**
 * Renders the device dashboard and mediates file transfers via
 * {@link module:hooks/useP2P}.
 *
 * @returns {JSX.Element} The dashboard page.
 */
const Dashboard = () => {
    const { user } = useAuth();
    const { onlineDevices, transferProgress, transferStats, sendFile, pendingTransfers, acceptTransfer, rejectTransfer, removeDevice } = useP2P();
    const [selectedFiles, setSelectedFiles] = useState({});
    const [showPairingModal, setShowPairingModal] = useState(false);
    const [deviceToRevoke, setDeviceToRevoke] = useState(null);
    const [revokedDevices, setRevokedDevices] = useState([]);

    /** Refetches the current user's revoked-devices list. */
    const fetchRevokedDevices = useCallback(async (signal) => {
        try {
            const res = await api.get('/auth/revoked-devices', { signal });
            setRevokedDevices(res.data.data.devices);
        } catch (err) {
            if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') return;
            console.error('Failed to load revoked devices', err);
        }
    }, []);

    useEffect(() => {
        if (user?.isGuest) return undefined;

        const controller = new AbortController();
        fetchRevokedDevices(controller.signal);
        return () => controller.abort();
    }, [user, fetchRevokedDevices]);

    /** Reactivates a revoked device, letting it log in again. */
    const handleReactivate = async (deviceId) => {
        try {
            await api.post('/auth/reactivate-device', { deviceId });
            setRevokedDevices((prev) => prev.filter((d) => d.deviceId !== deviceId));
            toast.success('Device reactivated. It can log in again.');
        } catch (err) {
            console.error('Reactivation failed', err);
            toast.error('Failed to reactivate device');
        }
    };

    /** Stores the file chosen for a given target device. */
    const handleFileChange = useCallback((e, deviceId) => {
        if (e.target.files[0]) {
            setSelectedFiles(prev => ({ ...prev, [deviceId]: e.target.files[0] }));
        }
    }, []);

    /** Sends the file currently selected for a device, if any. */
    const handleSend = useCallback((deviceId) => {
        const file = selectedFiles[deviceId];
        if (file) {
            sendFile(file, deviceId);
        }
    }, [selectedFiles, sendFile]);

    /** Opens the revoke-device confirmation modal for a device. */
    const handleRevoke = useCallback((deviceId) => {
        setDeviceToRevoke(deviceId);
    }, []);

    /** Revokes the pending device's access after user confirmation. */
    const confirmRevoke = async () => {
        const deviceId = deviceToRevoke;
        setDeviceToRevoke(null);

        try {
            await api.post('/auth/revoke', { deviceId });
            removeDevice(deviceId);
            fetchRevokedDevices();
        } catch (err) {
            console.error('Revocation failed', err);
            toast.error('Failed to revoke device');
        }
    };

    return (
        <div className="container py-5 mt-5">
            <header className="mb-5 text-center position-relative">
                <h1 className="display-4 fw-bold">My Devices</h1>
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

            {!user?.isGuest && revokedDevices.length > 0 && (
                <div className="mt-5">
                    <h2 className="h4 fw-bold mb-3">Revoked Devices</h2>
                    <div className="list-group shadow-sm">
                        {revokedDevices.map((device) => (
                            <div
                                key={device.deviceId}
                                className="list-group-item d-flex justify-content-between align-items-center flex-wrap gap-2 py-3"
                            >
                                <div>
                                    <div className="fw-semibold">{device.deviceName}</div>
                                    <div className="text-muted small">
                                        Revoked {new Date(device.revokedAt).toLocaleString()}
                                    </div>
                                </div>
                                <button
                                    className="btn btn-outline-success btn-sm rounded-pill"
                                    onClick={() => handleReactivate(device.deviceId)}
                                >
                                    <i className="bi bi-arrow-counterclockwise me-1"></i>
                                    Reactivate
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {Object.entries(pendingTransfers).map(([deviceId, transfer]) => (
                <Modal show onHide={() => rejectTransfer(deviceId)} centered key={deviceId} contentClassName="border-0 shadow-lg">
                    <Modal.Header closeButton closeVariant="white" className="bg-primary text-white border-bottom-0">
                        <Modal.Title className="fw-bold">
                            <i className="bi bi-cloud-download me-2"></i>
                            Incoming File Request
                        </Modal.Title>
                    </Modal.Header>
                    <Modal.Body className="p-4 text-center">
                        <div className="mb-3">
                            <i className="bi bi-file-earmark-text display-1 text-primary"></i>
                        </div>
                        <h6 className="fw-bold mb-1">{transfer.fileName}</h6>
                        <p className="text-muted small mb-3">{(transfer.fileSize / 1024 / 1024).toFixed(2)} MB</p>
                        <p className="mb-0">
                            From <strong>{transfer.deviceName}</strong>
                        </p>
                    </Modal.Body>
                    <Modal.Footer className="border-top-0 justify-content-center pb-4">
                        <Button variant="outline-secondary" className="rounded-pill px-4" onClick={() => rejectTransfer(deviceId)}>
                            Decline
                        </Button>
                        <Button variant="primary" className="rounded-pill px-4 fw-bold" onClick={() => acceptTransfer(deviceId)}>
                            Accept & Download
                        </Button>
                    </Modal.Footer>
                </Modal>
            ))}

            <Modal show={!!deviceToRevoke} onHide={() => setDeviceToRevoke(null)} centered contentClassName="border-0 shadow-lg">
                <Modal.Header closeButton closeVariant="white" className="bg-danger text-white border-bottom-0">
                    <Modal.Title className="fw-bold">
                        <i className="bi bi-exclamation-triangle me-2"></i>
                        Revoke Device
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-4 text-center">
                    <p className="mb-0">Are you sure you want to revoke this device? It will be disconnected immediately.</p>
                </Modal.Body>
                <Modal.Footer className="border-top-0 justify-content-center pb-4">
                    <Button variant="outline-secondary" className="rounded-pill px-4" onClick={() => setDeviceToRevoke(null)}>
                        Cancel
                    </Button>
                    <Button variant="danger" className="rounded-pill px-4 fw-bold" onClick={confirmRevoke}>
                        Revoke
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default Dashboard;
