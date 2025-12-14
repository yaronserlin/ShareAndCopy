import React, { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';
import toast from 'react-hot-toast';
import axios from 'axios';
import API_BASE_URL from '../../../config';
import Modal from '../../../components/common/Modal'; // Use shared Modal
import '../styles/RoomView.css';

const RoomHeader = ({ roomId, usedStorage, maxStorage, ownerName, isOwner, isUploading, uploadProgress, uploadSpeed, uploadETA }) => {
    const [showQRModal, setShowQRModal] = useState(false);
    const [roomUrl, setRoomUrl] = useState(`${window.location.origin}/room/${roomId}`);
    const [showUploadProgress, setShowUploadProgress] = useState(false);

    // Handle Upload Progress Visibility (keep visible for 3s after done)
    useEffect(() => {
        let timer;
        if (isUploading) {
            setShowUploadProgress(true);
        } else if (showUploadProgress && !isUploading) {
            timer = setTimeout(() => {
                setShowUploadProgress(false);
            }, 3000);
        }
        return () => clearTimeout(timer);
    }, [isUploading, showUploadProgress]);


    useEffect(() => {
        const fetchServerIp = async () => {
            // Only try to switch to IP if we are currently on localhost/127.0.0.1
            const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

            if (isLocal) {
                try {
                    const res = await axios.get(`${API_BASE_URL}/system/ip`); // Assume server is on 5001
                    if (res.data.ip) {
                        const protocol = window.location.protocol;
                        const port = window.location.port ? `:${window.location.port}` : '';
                        setRoomUrl(`${protocol}//${res.data.ip}${port}/room/${roomId}`);

                    }
                } catch (err) {
                    console.error('Failed to fetch server IP:', err);
                    // Fallback is already set to window.location.origin
                }
            }
        };

        fetchServerIp();
    }, [roomId]);

    const handleCopyUrl = async () => {
        try {
            // Try modern Clipboard API first (only works in Secure Contexts: HTTPS or localhost)
            await window.navigator.clipboard.writeText(roomUrl);
            toast.success('Room URL copied!');
        } catch (err) {
            console.warn('Clipboard API failed, trying fallback...');
            try {
                // Fallback for non-secure contexts (e.g., HTTP LAN)
                const textArea = document.createElement('textarea');
                textArea.value = roomUrl;

                // Ensure it's not visible but part of the DOM
                textArea.style.position = 'fixed';
                textArea.style.left = '-9999px';
                textArea.style.top = '0';
                document.body.appendChild(textArea);

                textArea.focus();
                textArea.select();

                const successful = document.execCommand('copy');
                document.body.removeChild(textArea);

                if (successful) {
                    toast.success('Room URL copied!');
                } else {
                    throw new Error('Fallback copy failed');
                }
            } catch (fallbackErr) {
                console.error('Copy failed:', fallbackErr);
                toast.error('Could not copy URL automatically');
            }
        }
    };

    const formatBytes = (bytes, decimals = 2) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    };

    const percentage = Math.min(100, (usedStorage / maxStorage) * 100);
    const isFull = usedStorage > (maxStorage * 0.9);

    return (
        <>
            <header className="room-header-wrapper d-flex flex-column gap-3 mb-4">

                {/* Top Row: Title + Name */}
                <div className="d-flex justify-content-between align-items-center w-100">
                    <div>
                        <h1 className="h3 fw-bold mb-1 text-primary text-capitalize">
                            {ownerName?.firstName && ownerName?.lastName
                                ? `${ownerName.firstName} ${ownerName.lastName}'s Room`
                                : 'My Room'}
                        </h1>
                        {/* Room ID with Copy */}
                        <div
                            className="d-flex align-items-center gap-2 text-secondary small cursor-pointer hover-opacity"
                            onClick={handleCopyUrl}
                            title="Click to copy Room Link"
                            style={{ cursor: "pointer" }}
                        >
                            <span className="fw-bold text-uppercase tracking-wider opacity-75" style={{ fontSize: '0.7rem' }}>ID:</span>
                            <span className="font-monospace user-select-all">{roomId}</span>
                            <i className="bi bi-copy ms-1 opacity-50"></i>
                        </div>
                    </div>

                    {/* QR Code Trigger */}
                    <div
                        className="header-qr-code shadow-sm cursor-pointer bg-white p-1 rounded"
                        onClick={() => setShowQRModal(true)}
                        title="Show QR Code"
                    >
                        <QRCode value={roomUrl} size={40} style={{ height: "40px", width: "40px" }} />
                    </div>
                </div>

                {/* Storage Counter (Full Width or nice block) */}
                {isOwner && (
                    <div className="w-100">
                        <div className="d-flex justify-content-between mb-1 small text-secondary fw-bold" style={{ fontSize: '0.75rem' }}>
                            <span>Storage Used</span>
                            <span>{formatBytes(usedStorage)} / {formatBytes(maxStorage)}</span>
                        </div>
                        <div className="progress storage-progress-bar rounded-pill" style={{ height: '8px' }}>
                            <div
                                className={`progress-bar rounded-pill ${isFull ? 'bg-danger' : 'bg-primary'}`}
                                role="progressbar"
                                style={{ width: `${percentage}%` }}
                            ></div>
                        </div>
                    </div>
                )}

                {/* Upload Progress Bar (Visible during upload or shortly after) */}
                {(showUploadProgress) && (
                    <div className="w-100 mt-2">
                        <div className="d-flex justify-content-between mb-1 small text-secondary fw-bold" style={{ fontSize: '0.75rem' }}>
                            <span className={isUploading ? "text-primary" : "text-success"}>
                                {isUploading ? "Uploading..." : "Upload Complete"}
                            </span>
                            <span>
                                {isUploading
                                    ? `${uploadSpeed || 0} MB/s • ${uploadETA !== null ? (uploadETA > 60 ? `${Math.ceil(uploadETA / 60)}m` : `${uploadETA}s`) : '--'} remaining`
                                    : "Done"}
                            </span>
                        </div>
                        <div className="progress storage-progress-bar rounded-pill" style={{ height: '8px' }}>
                            <div
                                className={`progress-bar rounded-pill ${isUploading ? 'progress-bar-striped progress-bar-animated bg-primary' : 'bg-success'}`}
                                role="progressbar"
                                style={{ width: `${uploadProgress}%` }}
                            ></div>
                        </div>
                    </div>
                )}
            </header>

            {/* QR Modal - Using Shared Modal Component */}
            {showQRModal && (
                <Modal onClose={() => setShowQRModal(false)}>
                    <div className="text-center">
                        <h4 className="mb-4 fw-bold text-primary">Scan to Share</h4>
                        <div
                            className="qr-big-container p-3 bg-white rounded-3 shadow-sm mx-auto mb-3 cursor-pointer"
                            onClick={handleCopyUrl}
                            title="Click QR to copy URL"
                            style={{ width: 'fit-content' }}
                        >
                            <QRCode value={roomUrl} size={250} style={{ maxWidth: '100%', height: 'auto' }} />
                        </div>
                        <p className="text-secondary small mb-1">Click the QR code to copy the link</p>
                        <div className="input-group mb-3">
                            <input
                                type="text"
                                className="form-control text-center text-primary fw-bold bg-light-subtle text-body"
                                value={roomUrl}
                                readOnly
                                onClick={(e) => e.target.select()}
                                style={{ cursor: 'pointer' }}
                            />
                        </div>

                    </div>
                </Modal>
            )}
        </>
    );
};

export default RoomHeader;

