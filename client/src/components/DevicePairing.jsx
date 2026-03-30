/**
 * Preview: client/src/components/DevicePairing.jsx
 * Description: Frontend application module.
 */

import React, { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';
import axios from 'axios';
import { useSocket } from '../context/SocketContext';
import { SERVER_URL, API_BASE_URL } from '../config';
import { Modal, Button, Spinner, Alert } from 'react-bootstrap';

const DevicePairing = ({ show, onHide }) => {
    const socket = useSocket();
    const [step, setStep] = useState('loading'); 
    const [pairingCode, setPairingCode] = useState(null);
    const [requestedDevice, setRequestedDevice] = useState(null);
    const [error, setError] = useState(null);

    
    useEffect(() => {
        if (show) {
            setStep('loading');
            setError(null);
            setRequestedDevice(null);
            generatePairingCode();
        } else {
            
            
        }
    }, [show]);

    
    useEffect(() => {
        if (!socket || !pairingCode) return;

        const onConfirmationRequest = ({ socketId, deviceInfo }) => {
            console.log('Pairing Request from:', deviceInfo);
            setRequestedDevice({ socketId, deviceInfo });
            setStep('confirm');
        };

        socket.on('confirmation-request', onConfirmationRequest);

        return () => {
            socket.off('confirmation-request', onConfirmationRequest);
        };
    }, [socket, pairingCode]);

    const generatePairingCode = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`${API_BASE_URL}/auth/pairing-code`, {}, {
                headers: { 'x-auth-token': token }
            });

            setPairingCode(res.data.code);
            setStep('show-qr');

            
            if (socket) {
                socket.emit('join-pairing', res.data.code);
            }

        } catch (err) {
            console.error('Error generating pairing code:', err);
            setError('Failed to generate pairing code');
            setStep('error');
        }
    };

    const approvePairing = () => {
        if (!requestedDevice) return;

        socket.emit('approve-pairing', {
            targetSocketId: requestedDevice.socketId
        });

        setStep('success');
        setTimeout(onHide, 2000); 
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
