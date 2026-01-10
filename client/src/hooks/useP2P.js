import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useSocket } from '../context/SocketContext';
import API_BASE_URL from '../config';

// Default ICE Configuration (Fallback)
const DEFAULT_ICE_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
];

const CHUNK_SIZE = 16 * 1024; // 16KB chunks

export const useP2P = () => {
    const socket = useSocket();
    const [onlineDevices, setOnlineDevices] = useState([]);
    const [transferProgress, setTransferProgress] = useState({}); // { deviceId: percentage }
    const [transferStats, setTransferStats] = useState({}); // { deviceId: { speed: string, eta: string } }
    const [pendingTransfers, setPendingTransfers] = useState({}); // { deviceId: { fileName, fileSize, channel } }
    const [connectionStatus, setConnectionStatus] = useState({}); // { deviceId: 'connected' | 'disconnected' | 'failed' | 'checking' }

    // Refs for PeerConnections: { deviceId: RTCPeerConnection }
    const peersRef = useRef({});
    // Refs for ICE Candidates Buffer: { deviceId: RTCIceCandidate[] }
    const candidatesBufferRef = useRef({});
    // Ref for ICE Servers
    const iceServersRef = useRef({ iceServers: DEFAULT_ICE_SERVERS });

    // Fetch WebRTC Config (TURN Credentials)
    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const res = await axios.get(`${API_BASE_URL}/system/webrtc-config`);
                if (res.data && res.data.data && res.data.data.iceServers) {
                    iceServersRef.current = { iceServers: res.data.data.iceServers };
                    console.log('WebRTC Configuration Loaded:', iceServersRef.current);
                }
            } catch (err) {
                console.error('Failed to fetch WebRTC config, using default STUN:', err);
            }
        };
        fetchConfig();
    }, []);

    useEffect(() => {
        if (!socket) return;

        // --- Socket Event Listeners ---

        // Handle Initial Device List (Device Discovery Fix)
        socket.on('initial-device-list', (devices) => {
            console.log('Received initial device list:', devices);
            setOnlineDevices(devices);
        });

        socket.on('device-online', (device) => {
            console.log('Device Online:', device);
            setOnlineDevices(prev => {
                if (prev.find(d => d.deviceId === device.deviceId)) return prev;
                return [...prev, device];
            });
        });

        socket.on('device-offline', ({ deviceId }) => {
            console.log('Device Offline:', deviceId);
            setOnlineDevices(prev => prev.filter(d => d.deviceId !== deviceId));
            // Cleanup Peer
            if (peersRef.current[deviceId]) {
                peersRef.current[deviceId].close();
                delete peersRef.current[deviceId];
            }
        });

        socket.on('signal', async ({ senderSocketId, senderDeviceId, type, signalData }) => {
            console.log(`Received Signal from ${senderDeviceId} (${type})`);

            // Note: Use senderSocketId to reply
            const peer = getOrCreatePeer(senderDeviceId, senderSocketId);

            try {
                if (type === 'offer') {
                    if (peer.signalingState !== 'stable') {
                        console.warn('Received offer but signaling state is:', peer.signalingState);
                        // Potential collision handling needed here in production
                    }

                    await peer.setRemoteDescription(new RTCSessionDescription(signalData));
                    console.log('Remote Description Set (Offer)');

                    // Process Buffered Candidates
                    if (candidatesBufferRef.current[senderDeviceId]) {
                        console.log(`Processing ${candidatesBufferRef.current[senderDeviceId].length} buffered candidates for ${senderDeviceId}`);
                        for (const candidate of candidatesBufferRef.current[senderDeviceId]) {
                            await peer.addIceCandidate(candidate);
                        }
                        delete candidatesBufferRef.current[senderDeviceId];
                    }

                    const answer = await peer.createAnswer();
                    await peer.setLocalDescription(answer);
                    console.log('Local Description Set (Answer), Sending Answer...');

                    socket.emit('signal', {
                        targetSocketId: senderSocketId,
                        type: 'answer',
                        signalData: answer
                    });
                } else if (type === 'answer') {
                    await peer.setRemoteDescription(new RTCSessionDescription(signalData));
                    console.log('Remote Description Set (Answer)');

                    // Process Buffered Candidates
                    if (candidatesBufferRef.current[senderDeviceId]) {
                        console.log(`Processing ${candidatesBufferRef.current[senderDeviceId].length} buffered candidates for ${senderDeviceId}`);
                        for (const candidate of candidatesBufferRef.current[senderDeviceId]) {
                            await peer.addIceCandidate(candidate);
                        }
                        delete candidatesBufferRef.current[senderDeviceId];
                    }
                } else if (type === 'candidate') {
                    const candidate = new RTCIceCandidate(signalData);
                    if (peer.remoteDescription && peer.remoteDescription.type) {
                        await peer.addIceCandidate(candidate);
                        console.log('Added ICE Candidate immediately');
                    } else {
                        // Buffer candidate
                        console.log('Buffering ICE Candidate (Remote Desc not ready)');
                        if (!candidatesBufferRef.current[senderDeviceId]) {
                            candidatesBufferRef.current[senderDeviceId] = [];
                        }
                        candidatesBufferRef.current[senderDeviceId].push(candidate);
                    }
                }
            } catch (err) {
                console.error('Signaling Error:', err);
            }
        });

        // Request fresh list on mount (fix for navigation)
        socket.emit('request-device-list');

        return () => {
            socket.off('initial-device-list');
            socket.off('device-online');
            socket.off('device-offline');
            socket.off('signal');
            Object.values(peersRef.current).forEach(p => p.close());
        };
    }, [socket]);

    // --- Helper: Get or Create Peer Connection ---
    const getOrCreatePeer = (targetDeviceId, targetSocketId) => {
        if (peersRef.current[targetDeviceId]) {
            const p = peersRef.current[targetDeviceId];
            console.log(`Using existing peer for ${targetDeviceId}. ConnectionState: ${p.connectionState}`);
            return p;
        }

        console.log(`Creating new RTCPeerConnection for ${targetDeviceId}`);
        console.log(`Creating new RTCPeerConnection for ${targetDeviceId}`);
        const peer = new RTCPeerConnection(iceServersRef.current);
        peersRef.current[targetDeviceId] = peer;

        // Init Status
        setConnectionStatus(prev => ({ ...prev, [targetDeviceId]: 'checking' }));

        peer.oniceconnectionstatechange = () => {
            console.log(`ICE Connection State Change (${targetDeviceId}):`, peer.iceConnectionState);
            const state = peer.iceConnectionState;

            let status = 'checking';
            if (state === 'connected' || state === 'completed') status = 'connected';
            else if (state === 'failed') status = 'failed';
            else if (state === 'disconnected') status = 'disconnected';
            else if (state === 'closed') status = 'disconnected';

            setConnectionStatus(prev => ({ ...prev, [targetDeviceId]: status }));
        };

        peer.onconnectionstatechange = () => {
            console.log(`Peer Connection State Change (${targetDeviceId}):`, peer.connectionState);
        };

        // Handle ICE Candidates
        peer.onicecandidate = (event) => {
            if (event.candidate && socket) {
                socket.emit('signal', {
                    targetSocketId,
                    type: 'candidate',
                    signalData: event.candidate
                });
            }
        };

        // Handle Data Channel (Receiver Side)
        peer.ondatachannel = (event) => {
            console.log(`Received Data Channel from ${targetDeviceId}`);
            const channel = event.channel;
            setupReceiveChannel(channel, targetDeviceId);
        };

        return peer;
    };

    // --- Setup Data Channel for Receiving ---
    const setupReceiveChannel = (channel, deviceId) => {
        let receivedBuffers = [];
        let receivedSize = 0;
        let fileMeta = null;

        channel.onopen = () => console.log(`Data Channel Opened (Receiver) for ${deviceId}`);
        channel.onclose = () => console.log(`Data Channel Closed (Receiver) for ${deviceId}`);

        channel.onmessage = async (event) => {
            const data = event.data;

            // Handle Strings (Metadata/Control)
            if (typeof data === 'string') {
                try {
                    const message = JSON.parse(data);
                    if (message.type === 'METADATA') {
                        console.log(`Receiving file offer: ${message.fileName} (${message.fileSize} bytes)`);
                        // Set Pending Transfer
                        setPendingTransfers(prev => ({
                            ...prev,
                            [deviceId]: {
                                fileName: message.fileName,
                                fileSize: message.fileSize,
                                deviceName: onlineDevices.find(d => d.deviceId === deviceId)?.deviceName || 'Unknown Device',
                                channel // Store channel to reply
                            }
                        }));

                        // We do NOT set progress or fileMeta/buffers yet. We wait for user action.
                        // However, we need to persist fileMeta in the closure for when data starts arriving? 
                        // No, the channel listener is closure-bound. 
                        // But `fileMeta` variable is local to `setupReceiveChannel`. 
                        // If we exit this event handler, `fileMeta` is still in the higher scope?
                        // YES, `fileMeta` is defined in `setupReceiveChannel` scope.
                        // So we can update it here, but we shouldn't start processing chunks until we decide.

                        fileMeta = message;
                        receivedBuffers = [];
                        receivedSize = 0;

                    } else if (message.type === 'FINISH') {
                        console.log('File Transfer Complete. Reassembling...');
                        const blob = new Blob(receivedBuffers);
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = fileMeta.fileName;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);

                        setTransferProgress(prev => ({ ...prev, [deviceId]: 100 }));

                        // Report Stats (Receiver - Download)
                        socket.emit('report-transfer', { size: fileMeta.fileSize, type: 'download' });

                        setTimeout(() => setTransferProgress(prev => {
                            const newState = { ...prev };
                            delete newState[deviceId];
                            return newState;
                        }), 3000);
                    }
                } catch (e) {
                    console.error('Error parsing signaling message', e);
                }
            }
            // Handle ArrayBuffer (File Chunks)
            else {
                // ... (Existing Chunk Logic)
                receivedBuffers.push(data);
                receivedSize += data.byteLength;

                if (fileMeta) {
                    const progress = Math.round((receivedSize / fileMeta.fileSize) * 100);
                    setTransferProgress(prev => {
                        // ... (Existing Progress Logic)
                        const current = prev[deviceId] || 0;
                        if (progress - current >= 5 || progress === 100) {
                            return ({ ...prev, [deviceId]: progress });
                        }
                        return prev;
                    });
                }
            }
        };
    };

    // --- Helper: Send Chunks (Adaptive & Stats) ---
    const sendChunks = async (channel, file, targetDeviceId) => {
        const MAX_BUFFERED_AMOUNT = 64 * 1024; // 64KB safe limit
        channel.bufferedAmountLowThreshold = MAX_BUFFERED_AMOUNT / 2;

        let offset = 0;
        const CHUNK_SIZE_FIXED = 16 * 1024; // Fixed 16KB

        const startTime = Date.now();
        let lastStatTime = startTime;
        let lastByteCount = 0;
        let logCounter = 0;

        while (offset < file.size) {
            // Flow Control
            if (channel.bufferedAmount > MAX_BUFFERED_AMOUNT) {
                console.log(`[Send] Buffer full (${channel.bufferedAmount}). Waiting...`);
                // Wait for buffer to drain (Event + Polling Fallback)
                await new Promise(resolve => {
                    let resolved = false;
                    const cleanup = () => {
                        resolved = true;
                        channel.removeEventListener('bufferedamountlow', onLowBuffer);
                        clearInterval(polling);
                    };

                    const onLowBuffer = () => {
                        if (!resolved) {
                            cleanup();
                            resolve();
                        }
                    };

                    // 1. Event Listener
                    channel.addEventListener('bufferedamountlow', onLowBuffer);

                    // 2. Polling Fallback (in case event is missed)
                    const polling = setInterval(() => {
                        if (channel.bufferedAmount <= channel.bufferedAmountLowThreshold) {
                            onLowBuffer();
                        }
                    }, 200);
                });
                console.log(`[Send] Buffer drained (${channel.bufferedAmount}). Resuming.`);
            }

            if (channel.readyState !== 'open') {
                console.error('[Send] Channel closed unexpectedly');
                break;
            }

            // Fixed Chunk Size
            const currentChunkSize = Math.min(CHUNK_SIZE_FIXED, file.size - offset);
            const chunk = file.slice(offset, offset + currentChunkSize);
            const buffer = await chunk.arrayBuffer();

            try {
                channel.send(buffer);
                logCounter++;
                if (logCounter % 50 === 0) {
                    console.log(`[Send] Sent chunk ${logCounter}. Offset: ${offset}/${file.size}. Buffer: ${channel.bufferedAmount}`);
                }
            } catch (e) {
                console.error('Send Error:', e);
                break;
            }

            offset += chunk.size;

            // Stats & Progress (Keep existing logic)
            const now = Date.now();
            if (now - lastStatTime >= 1000 || offset >= file.size) {
                const timeDiff = (now - lastStatTime) / 1000; // seconds
                const bytesDiff = offset - lastByteCount;
                const speedBytes = bytesDiff / (timeDiff || 1);
                const speedMB = (speedBytes / (1024 * 1024)).toFixed(2);

                const remainingBytes = file.size - offset;
                const etaSeconds = speedBytes > 0 ? Math.ceil(remainingBytes / speedBytes) : 0;


                setTransferStats(prev => ({
                    ...prev,
                    [targetDeviceId]: { speed: `${speedMB} MB/s`, eta: `${etaSeconds}s` }
                }));

                const progress = Math.round((offset / file.size) * 100);
                setTransferProgress(prev => ({ ...prev, [targetDeviceId]: progress }));

                lastStatTime = now;
                lastByteCount = offset;
            }
        }

        // Final Cleanup stats
        setTransferStats(prev => {
            const n = { ...prev };
            delete n[targetDeviceId];
            return n;
        });
    };

    // --- Action: Send File ---
    const sendFile = async (file, targetDeviceId) => {
        const targetDevice = onlineDevices.find(d => d.deviceId === targetDeviceId);

        if (!targetDevice) {
            console.error('Target device not online or not found');
            alert('Target device not reachable');
            return;
        }

        const targetSocketId = targetDevice.socketId;
        console.log(`Initiating File Transfer to ${targetDeviceId} (Socket: ${targetSocketId})`);

        // Initialize Peer (Initiator)
        // Ensure we handle case where peer exists but is failed?
        // simple approach: just reuse or create
        const peer = getOrCreatePeer(targetDeviceId, targetSocketId);

        // Create Data Channel
        // Important: Create channel BEFORE creating offer
        const channel = peer.createDataChannel('file-transfer');

        channel.onopen = async () => {
            console.log(`Data Channel Opened (Sender) for ${targetDeviceId}. Starting Transfer...`);

            // 1. Send Metadata
            const metadata = {
                type: 'METADATA',
                fileName: file.name,
                fileSize: file.size,
                chunkCount: Math.ceil(file.size / CHUNK_SIZE)
            };
            channel.send(JSON.stringify(metadata));
            console.log('Metadata sent. Waiting for acceptance...');

            // New: Wait for ACCEPT/REJECT response
            channel.onmessage = async (event) => {
                const data = event.data;
                if (typeof data === 'string') {
                    try {
                        const message = JSON.parse(data);
                        if (message.type === 'ACCEPT') {
                            console.log('Transfer Accepted by receiver. Starting Send...');
                            // 2. Send Chunks logic here
                            await sendChunks(channel, file, targetDeviceId);

                            // 3. Send Finish
                            if (channel.readyState === 'open') {
                                channel.send(JSON.stringify({ type: 'FINISH' }));
                                console.log('File Transfer Finished (Sender side)');

                                // Report Stats
                                socket.emit('report-transfer', { size: file.size, type: 'upload' });
                            }
                        } else if (message.type === 'REJECT') {
                            console.log('Transfer Rejected by receiver.');
                            alert('File transfer declined by the recipient.');
                            channel.close();
                        }
                    } catch (e) {
                        console.error('Error handling sender response', e);
                    }
                }
            };

        };

        channel.onclose = () => console.log('Data Channel Closed (Sender)');
        channel.onerror = (e) => console.error('Data Channel Error:', e);

        // Initiate Offer if needed
        // If peer connection is new or needs negotiation, create offer
        peer.onnegotiationneeded = async () => {
            console.log('Negotiation Needed');
            try {
                const offer = await peer.createOffer();
                await peer.setLocalDescription(offer);
                console.log('Sending Offer...');
                socket.emit('signal', {
                    targetSocketId,
                    type: 'offer',
                    signalData: offer
                });
            } catch (err) {
                console.error('Error during negotiation:', err);
            }
        };

    };

    // --- Action: Accept Transfer ---
    const acceptTransfer = (deviceId) => {
        const transfer = pendingTransfers[deviceId];
        if (!transfer) return;

        console.log(`Accepting transfer from ${deviceId}`);
        transfer.channel.send(JSON.stringify({ type: 'ACCEPT' }));

        // Remove from pending
        setPendingTransfers(prev => {
            const newState = { ...prev };
            delete newState[deviceId];
            return newState;
        });

        // Initialize progress
        setTransferProgress(prev => ({ ...prev, [deviceId]: 0 }));
    };

    // --- Action: Reject Transfer ---
    const rejectTransfer = (deviceId) => {
        const transfer = pendingTransfers[deviceId];
        if (!transfer) return;

        console.log(`Rejecting transfer from ${deviceId}`);
        transfer.channel.send(JSON.stringify({ type: 'REJECT' }));
        // Remove from pending
        setPendingTransfers(prev => {
            const newState = { ...prev };
            delete newState[deviceId];
            return newState;
        });
    };

    return {
        onlineDevices,
        transferProgress,
        pendingTransfers,
        acceptTransfer,
        rejectTransfer,
        sendFile,
        connectionStatus,
        transferStats
    };
};


