
import React, { useState, useEffect } from 'react';
import { Button, Form, Alert, Spinner } from 'react-bootstrap';
import io from 'socket.io-client';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { SERVER_URL, API_BASE_URL } from '../config';
import { getFriendlyDeviceName } from '../utils/deviceUtils';

const PairingLogin = ({ onCancel }) => {
    // const socket = useSocket(); // DON'T use global socket here initially, as it lacks token
    const [tempSocket, setTempSocket] = useState(null);
    const navigate = useNavigate();
    const { login } = useAuth(); // We might need a way to set token manually

    // Manual Input State
    const [code, setCode] = useState('');
    const [status, setStatus] = useState('input'); // input, connecting, waiting, success, error
    const [error, setError] = useState(null);
    const location = useLocation();

    // Check for auto-code in URL
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const urlCode = params.get('pairingCode');

        if (urlCode && status === 'input') {
            setCode(urlCode);
            // Auto-submit after a brief delay to ensure socket is ready?
            // checking socket might be better, but let's try immediate or small timeout
            // For safety, we can just pre-fill. If we want auto-submit, we need 'handlePairingRequest' to be callable here.

            // Let's just pre-fill for now and let user click "Request" to be explicitly sure?
            // User said "scan it, it not add", implying they want it to just work.
            // Let's try auto-submitting if socket is ready.
        }
    }, [location]);

    // Cleanup temp socket
    useEffect(() => {
        return () => {
            if (tempSocket) tempSocket.disconnect();
        };
    }, [tempSocket]);

    // Auto-submit effect
    useEffect(() => {
        if (code && code.length === 6 && status === 'input') {
            const params = new URLSearchParams(location.search);
            if (params.get('pairingCode') === code) {
                // Trigger auto-submit logic
                handlePairingRequest(new Event('submit'));
            }
        }
    }, [code]); // Removed socket dependency

    const handlePairingRequest = async (e) => {
        e.preventDefault();
        if (!code || code.length !== 6) {
            setError('Please enter a valid 6-character code.');
            return;
        }

        setStatus('connecting');
        setError(null);

        try {
            // 1. Verify Code & Get Pairing Token via HTTP
            const res = await axios.post(`${API_BASE_URL}/auth/verify-pairing`, { code: code.toUpperCase() });

            if (!res.data.valid || !res.data.pairingToken) {
                throw new Error('Invalid code');
            }

            const pairingToken = res.data.pairingToken;

            // 2. Connect to Socket with Pairing Token
            const socket = io(SERVER_URL, {
                auth: { token: pairingToken }
            });

            socket.on('connect_error', (err) => {
                console.error('Pairing Socket Error:', err);
                setError('Failed to connect to pairing server.');
                setStatus('input');
                socket.disconnect();
            });

            socket.on('connect', () => {
                // 3. Request Pairing
                const deviceInfo = {
                    deviceName: getFriendlyDeviceName(),
                    model: navigator.userAgent,
                    os: navigator.platform
                };

                socket.emit('request-pairing', {
                    code: code.toUpperCase(),
                    deviceInfo
                });

                setStatus('waiting');
            });

            socket.on('pairing-success', ({ token, user }) => {
                console.log('Pairing Successful! Token received.', user);
                login(token, user.roomId, false);
                socket.disconnect();
                navigate('/dashboard');
            });

            socket.on('pairing-error', (payload) => {
                console.error('Pairing Error:', payload);
                setError(payload?.message || 'Pairing failed.');
                setStatus('input');
                socket.disconnect();
            });

            setTempSocket(socket);

        } catch (err) {
            console.error(err);
            setError(err.response?.data?.message || 'Failed to verify code.');
            setStatus('input');
        }
    };

    return (
        <div className="card shadow-sm p-4 border-0" style={{ maxWidth: '400px', margin: '0 auto' }}>
            <h3 className="text-center mb-4">Pair New Device</h3>

            {status === 'input' && (
                <Form onSubmit={handlePairingRequest}>
                    <Form.Group className="mb-3">
                        <Form.Label>Enter Pairing Code</Form.Label>
                        <Form.Control
                            type="text"
                            placeholder="6-Digit Code"
                            value={code}
                            onChange={(e) => setCode(e.target.value.toUpperCase())}
                            maxLength={6}
                            className="text-center fw-bold fs-4"
                        />
                        <Form.Text className="text-muted">
                            Scan QR on your other device to get the code.
                        </Form.Text>
                    </Form.Group>

                    {error && <Alert variant="danger">{error}</Alert>}

                    <div className="d-grid gap-2">
                        <Button variant="primary" type="submit" size="lg">
                            Request Pairing
                        </Button>
                        <Button variant="outline-secondary" onClick={onCancel}>
                            Cancel
                        </Button>
                    </div>
                </Form>
            )}

            {(status === 'connecting' || status === 'waiting') && (
                <div className="text-center py-4">
                    <Spinner animation="border" variant="primary" className="mb-3" />
                    <h5>{status === 'connecting' ? 'Connecting...' : 'Waiting for approval...'}</h5>
                    <p className="text-muted">Check your logged-in device to approve this connection.</p>
                </div>
            )}
        </div>
    );
};

export default PairingLogin;
