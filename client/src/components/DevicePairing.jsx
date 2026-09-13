/**
 * Modal that walks a signed-in user through pairing a new device: it
 * requests a one-time pairing code, displays it as a QR code, and listens
 * on the shared socket for the new device's confirmation request so the
 * user can approve or deny it.
 */

import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'react-qr-code';
import api from '../utils/api';
import { useSocket } from '../context/SocketContext';
import { Modal, Button, Spinner, Alert } from 'react-bootstrap';

/**
 * @param {Object} props
 * @param {boolean} props.show - Whether the modal is visible.
 * @param {() => void} props.onHide - Called to close the modal.
 * @returns {JSX.Element} The device pairing modal.
 */
const DevicePairing = ({ show, onHide }) => {
    const socket = useSocket();
    const [step, setStep] = useState('loading');
    const [pairingCode, setPairingCode] = useState(null);
    const [requestedDevice, setRequestedDevice] = useState(null);
    const [error, setError] = useState(null);
    const closeTimeoutRef = useRef(null);

    useEffect(() => {
        let cancelled = false;

        if (show) {
            setStep('loading');
            setError(null);
            setRequestedDevice(null);
            generatePairingCode(() => cancelled);
        }

        return () => {
            cancelled = true;
            clearTimeout(closeTimeoutRef.current);
        };
    }, [show]);

    useEffect(() => {
        if (!socket || !pairingCode) return;

        const onConfirmationRequest = ({ socketId, deviceInfo }) => {
            console.log('Pairing Request from:', deviceInfo);
            setRequestedDevice({ socketId, deviceInfo });
            setStep('confirm');
        };

        const onPairingError = ({ message }) => {
            console.error('Pairing Error:', message);
            clearTimeout(closeTimeoutRef.current);
            setError(message || 'Failed to approve device.');
            setStep('error');
        };

        socket.on('confirmation-request', onConfirmationRequest);
        socket.on('pairing-error', onPairingError);

        return () => {
            socket.off('confirmation-request', onConfirmationRequest);
            socket.off('pairing-error', onPairingError);
        };
    }, [socket, pairingCode]);

    /**
     * Requests a new pairing code from the server and joins its socket
     * room so this device can receive the pairing confirmation request.
     *
     * @param {() => boolean} [isCancelled] - Returns true if the owning
     *   effect has since been cleaned up (e.g. the modal was hidden
     *   again), so a stale response doesn't overwrite newer state.
     * @returns {Promise<void>}
     */
    const generatePairingCode = async (isCancelled) => {
        try {
            const res = await api.post('/auth/pairing-code', {});

            if (isCancelled?.()) return;

            setPairingCode(res.data.data.code);
            setStep('show-qr');

            if (socket) {
                socket.emit('join-pairing', res.data.data.code);
            }

        } catch (err) {
            if (isCancelled?.()) return;
            console.error('Error generating pairing code:', err);
            setError('Failed to generate pairing code');
            setStep('error');
        }
    };

    /**
     * Approves the pending device's pairing request and closes the modal
     * shortly after showing a success message.
     */
    const approvePairing = () => {
        if (!requestedDevice) return;

        socket.emit('approve-pairing', {
            targetSocketId: requestedDevice.socketId,
            code: pairingCode
        });

        setStep('success');
        closeTimeoutRef.current = setTimeout(onHide, 2000);
    };

    return (
        <Modal show={show} onHide={onHide} centered>
            <Modal.Header closeButton>
                <Modal.Title>Add New Device</Modal.Title>
            </Modal.Header>
            <Modal.Body className="text-center">

                {step === 'loading' && <Spinner animation="border" />}

                {step === 'error' && <Alert variant="danger">{error}</Alert>}

                {step === 'show-qr' && pairingCode && (
                    <div>
                        <p>Scan this QR code with the new device to log in automatically.</p>
                        <div style={{ background: 'white', padding: '16px', display: 'inline-block' }}>
                            <QRCode value={`${window.location.origin}/login?pairingCode=${pairingCode}`} level="M" />
                        </div>
                        <h3 className="mt-3">{pairingCode}</h3>
                    </div>
                )}

                {step === 'confirm' && requestedDevice && (
                    <div>
                        <h4>New Device Found!</h4>
                        <p><strong>Device:</strong> {requestedDevice.deviceInfo?.model || 'Unknown'}</p>
                        <p><strong>OS:</strong> {requestedDevice.deviceInfo?.os || 'Unknown'}</p>
                        <Alert variant="warning">Do you want to authorize this device?</Alert>
                    </div>
                )}

                {step === 'success' && (
                    <Alert variant="success">Device Authorized Successfully!</Alert>
                )}

            </Modal.Body>
            <Modal.Footer>
                {step === 'confirm' ? (
                    <>
                        <Button variant="secondary" onClick={onHide}>Deny</Button>
                        <Button variant="success" onClick={approvePairing}>Approve</Button>
                    </>
                ) : (
                    <Button variant="secondary" onClick={onHide}>Close</Button>
                )}
            </Modal.Footer>
        </Modal>
    );
};

export default DevicePairing;
