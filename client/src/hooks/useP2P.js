import { useState, useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';

// ICE Configuration (Google STUN)
const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

const CHUNK_SIZE = 16 * 1024; // 16KB chunks

export const useP2P = () => {
    const socket = useSocket();
    const [onlineDevices, setOnlineDevices] = useState([]);
    const [transferProgress, setTransferProgress] = useState({}); // { deviceId: percentage }
    const [pendingTransfers, setPendingTransfers] = useState({}); // { deviceId: { fileName, fileSize, channel } }

    // Refs for PeerConnections: { deviceId: RTCPeerConnection }
    const peersRef = useRef({});
    // Refs for ICE Candidates Buffer: { deviceId: RTCIceCandidate[] }
    const candidatesBufferRef = useRef({});

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
        const peer = new RTCPeerConnection(ICE_SERVERS);
        peersRef.current[targetDeviceId] = peer;

        peer.oniceconnectionstatechange = () => {
            console.log(`ICE Connection State Change (${targetDeviceId}):`, peer.iceConnectionState);
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

    // --- Helper: Send Chunks ---
    const sendChunks = async (channel, file, targetDeviceId) => {
        const MAX_BUFFERED_AMOUNT = 64 * 1024; // 64KB safe limit
        channel.bufferedAmountLowThreshold = MAX_BUFFERED_AMOUNT / 2;
        let offset = 0;

        while (offset < file.size) {
            if (channel.bufferedAmount > MAX_BUFFERED_AMOUNT) {
                await new Promise(resolve => {
                    const onLowBuffer = () => {
                        channel.removeEventListener('bufferedamountlow', onLowBuffer);
                        resolve();
                    };
                    channel.addEventListener('bufferedamountlow', onLowBuffer);
                });
            }

            if (channel.readyState !== 'open') break;

            const chunk = file.slice(offset, offset + CHUNK_SIZE);
            const buffer = await chunk.arrayBuffer();

            try {
                channel.send(buffer);
            } catch (e) {
                console.error('Send Error:', e);
                break;
            }

            offset += CHUNK_SIZE;
            const progress = Math.round((offset / file.size) * 100);
            setTransferProgress(prev => {
                const current = prev[targetDeviceId] || 0;
                if (progress - current >= 5 || progress === 100) {
                    return ({ ...prev, [targetDeviceId]: progress });
                }
                return prev;
            });
        }
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
        sendFile
    };
};


