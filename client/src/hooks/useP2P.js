/**
 * Preview: client/src/hooks/useP2P.js
 * Description: Frontend application module.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useSocket } from '../context/SocketContext';
import API_BASE_URL from '../config';


const DEFAULT_ICE_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
];

const CHUNK_SIZE = 16 * 1024; 
const MAX_FILE_SIZE = 500 * 1024 * 1024; 


const generateUUID = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

export const useP2P = () => {
    const socket = useSocket();
    const [onlineDevices, setOnlineDevices] = useState([]);
    const [transferProgress, setTransferProgress] = useState({}); 
    const [transferStats, setTransferStats] = useState({}); 
    const [pendingTransfers, setPendingTransfers] = useState({}); 
    const [connectionStatus, setConnectionStatus] = useState({}); 

    
    const progressUpdateScheduled = useRef(false);
    const pendingProgressUpdates = useRef({});

    
    const objectURLsRef = useRef(new Set());

    
    const peersRef = useRef({});
    
    const candidatesBufferRef = useRef({});
    
    const iceServersRef = useRef({ iceServers: DEFAULT_ICE_SERVERS });

    
    const updateProgress = useCallback((deviceId, progress) => {
        pendingProgressUpdates.current[deviceId] = progress;

        if (!progressUpdateScheduled.current) {
            progressUpdateScheduled.current = true;
            requestAnimationFrame(() => {
                setTransferProgress(prev => ({
                    ...prev,
                    ...pendingProgressUpdates.current
                }));
                pendingProgressUpdates.current = {};
                progressUpdateScheduled.current = false;
            });
        }
    }, []);

    
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
            
            if (peersRef.current[deviceId]) {
                peersRef.current[deviceId].close();
                delete peersRef.current[deviceId];
            }
        });

        socket.on('signal', async ({ senderSocketId, senderDeviceId, type, signalData }) => {
            console.log(`Received Signal from ${senderDeviceId} (${type})`);

            
            const peer = getOrCreatePeer(senderDeviceId, senderSocketId);

            try {
                if (type === 'offer') {
                    if (peer.signalingState !== 'stable') {
                        console.warn('Received offer but signaling state is:', peer.signalingState);
                        
                    }

                    await peer.setRemoteDescription(new RTCSessionDescription(signalData));
                    console.log('Remote Description Set (Offer)');

                    
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

        
        socket.emit('request-device-list');

        return () => {
            socket.off('initial-device-list');
            socket.off('device-online');
            socket.off('device-offline');
            socket.off('signal');

            
            Object.keys(peersRef.current).forEach(deviceId => {
                const peer = peersRef.current[deviceId];
                if (peer) {
                    peer.close();
                    delete peersRef.current[deviceId];
                }
            });

            
            Object.keys(candidatesBufferRef.current).forEach(deviceId => {
                delete candidatesBufferRef.current[deviceId];
            });

            
            objectURLsRef.current.forEach(url => {
                URL.revokeObjectURL(url);
            });
            objectURLsRef.current.clear();
        };
    }, [socket]);

    
    const getOrCreatePeer = (targetDeviceId, targetSocketId) => {
        if (peersRef.current[targetDeviceId]) {
            const p = peersRef.current[targetDeviceId];
            console.log(`Using existing peer for ${targetDeviceId}. ConnectionState: ${p.connectionState}`);
            return p;
        }

        console.log(`Creating new RTCPeerConnection for ${targetDeviceId}`);
        const peer = new RTCPeerConnection(iceServersRef.current);
        peersRef.current[targetDeviceId] = peer;

        
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

        
        peer.onicecandidate = (event) => {
            if (event.candidate && socket) {
                socket.emit('signal', {
                    targetSocketId,
                    type: 'candidate',
                    signalData: event.candidate
                });
            }
        };

        
        peer.ondatachannel = (event) => {
            console.log(`Received Data Channel from ${targetDeviceId}`);
            const channel = event.channel;
            setupReceiveChannel(channel, targetDeviceId);
        };

        return peer;
    };

    
    const setupReceiveChannel = (channel, deviceId) => {
        
        const activeTransfers = new Map(); 
        let currentTransferId = null;

        channel.onopen = () => console.log(`Data Channel Opened (Receiver) for ${deviceId}`);
        channel.onclose = () => console.log(`Data Channel Closed (Receiver) for ${deviceId}`);

        channel.onmessage = async (event) => {
            const data = event.data;

            
            if (typeof data === 'string') {
                try {
                    const message = JSON.parse(data);
                    if (message.type === 'METADATA') {
                        
                        if (!message.fileSize || message.fileSize <= 0 || message.fileSize > MAX_FILE_SIZE) {
                            console.error(`Invalid file size in metadata: ${message.fileSize}`);
                            toast.error('Invalid file metadata received');
                            return;
                        }

                        
                        const transferId = message.transferId || crypto.randomUUID();
                        currentTransferId = transferId;

                        console.log(`Receiving file offer [${transferId}]: ${message.fileName} (${message.fileSize} bytes)`);

                        
                        activeTransfers.set(transferId, {
                            fileMeta: message,
                            receivedBuffers: [],
                            receivedSize: 0
                        });

                        
                        setPendingTransfers(prev => ({
                            ...prev,
                            [deviceId]: {
                                fileName: message.fileName,
                                fileSize: message.fileSize,
                                deviceName: onlineDevices.find(d => d.deviceId === deviceId)?.deviceName || 'Unknown Device',
                                channel, 
                                transferId 
                            }
                        }));
                    } else if (message.type === 'FINISH') {
                        const transferId = message.transferId || currentTransferId;
                        const transfer = activeTransfers.get(transferId);

                        if (!transfer) {
                            console.error(`FINISH received for unknown transfer: ${transferId}`);
                            return;
                        }

                        console.log(`File Transfer Complete [${transferId}]. Reassembling...`);
                        const blob = new Blob(transfer.receivedBuffers);
                        const url = URL.createObjectURL(blob);

                        
                        objectURLsRef.current.add(url);

                        
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = transfer.fileMeta.fileName;
                        a.click();

                        
                        if (socket) {
                            socket.emit('report-transfer', { size: transfer.fileMeta.fileSize, type: 'download' });
                        }

                        setTransferProgress(prev => {
                            const newState = { ...prev };
                            delete newState[deviceId];
                            return newState;
                        });

                        
                        setTimeout(() => {
                            URL.revokeObjectURL(url);
                            objectURLsRef.current.delete(url);
                        }, 3000);
                        activeTransfers.delete(transferId);
                    }
                } catch (e) {
                    console.error('Error parsing signaling message', e);
                }
            }
            else {
                
                const transfer = activeTransfers.get(currentTransferId);

                if (!transfer) {
                    console.error('Received chunk for unknown transfer');
                    return;
                }

                
                if (transfer.receivedSize + data.byteLength > MAX_FILE_SIZE) {
                    console.error('Transfer exceeded max limits during reception.');
                    channel.close();
                    setTransferProgress(prev => {
                        const newState = { ...prev };
                        delete newState[deviceId]; 
                        return newState;
                    });
                    toast.error('Transfer aborted: Limit exceeded.');
                    activeTransfers.delete(currentTransferId);
                    return;
                }

                transfer.receivedBuffers.push(data);
                transfer.receivedSize += data.byteLength;

                if (transfer.fileMeta) {
                    const progress = Math.round((transfer.receivedSize / transfer.fileMeta.fileSize) * 100);
                    
                    updateProgress(deviceId, progress);
                }
            }
        };
    };

    
    const sendChunks = async (channel, file, targetDeviceId) => {
        const MAX_BUFFERED_AMOUNT = 64 * 1024; 
        channel.bufferedAmountLowThreshold = MAX_BUFFERED_AMOUNT / 2;

        let offset = 0;
        const CHUNK_SIZE_FIXED = 16 * 1024; 

        const startTime = Date.now();
        let lastStatTime = startTime;
        let lastByteCount = 0;
        let logCounter = 0;

        while (offset < file.size) {
            
            if (channel.bufferedAmount > MAX_BUFFERED_AMOUNT) {
                console.log(`[Send] Buffer full (${channel.bufferedAmount}). Waiting...`);
                
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

                    
                    channel.addEventListener('bufferedamountlow', onLowBuffer);

                    
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

            
            const now = Date.now();
            if (now - lastStatTime >= 1000 || offset >= file.size) {
                const timeDiff = (now - lastStatTime) / 1000; 
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

        
        setTransferStats(prev => {
            const n = { ...prev };
            delete n[targetDeviceId];
            return n;
        });
    };

    
    const sendFile = async (file, targetDeviceId) => {
        
        if (!socket || !socket.connected) {
            console.error('Cannot send file: Socket not connected');
            toast.error('Connection lost. Please refresh.');
            return;
        }

        const targetDevice = onlineDevices.find(d => d.deviceId === targetDeviceId);

        if (!targetDevice) {
            console.error('Target device not online or not found');
            alert('Target device not reachable');
            return;
        }

        const targetSocketId = targetDevice.socketId;
        console.log(`Initiating File Transfer to ${targetDeviceId} (Socket: ${targetSocketId})`);

        
        
        
        const peer = getOrCreatePeer(targetDeviceId, targetSocketId);

        
        
        const channel = peer.createDataChannel('file-transfer');

        channel.onopen = async () => {
            console.log(`Data Channel Opened (Sender) for ${targetDeviceId}. Starting Transfer...`);

            
            const transferId = generateUUID();

            
            const metadata = {
                type: 'METADATA',
                fileName: file.name,
                fileSize: file.size,
                chunkCount: Math.ceil(file.size / CHUNK_SIZE),
                transferId 
            };
            channel.send(JSON.stringify(metadata));
            console.log(`Metadata sent with transfer ID: ${transferId}. Waiting for acceptance...`);

            
            channel.onmessage = async (event) => {
                const data = event.data;
                if (typeof data === 'string') {
                    try {
                        const message = JSON.parse(data);
                        if (message.type === 'ACCEPT') {
                            console.log('Transfer Accepted by receiver. Starting Send...');
                            
                            await sendChunks(channel, file, targetDeviceId);

                            
                            if (channel.readyState === 'open') {
                                channel.send(JSON.stringify({ type: 'FINISH', transferId }));
                                console.log(`File Transfer Finished (Sender side) [${transferId}]`);

                                
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

    
    const acceptTransfer = (deviceId) => {
        const transfer = pendingTransfers[deviceId];
        if (!transfer) return;

        console.log(`Accepting transfer from ${deviceId}`);
        transfer.channel.send(JSON.stringify({ type: 'ACCEPT' }));

        
        setPendingTransfers(prev => {
            const newState = { ...prev };
            delete newState[deviceId];
            return newState;
        });

        
        setTransferProgress(prev => ({ ...prev, [deviceId]: 0 }));
    };

    
    const rejectTransfer = (deviceId) => {
        const transfer = pendingTransfers[deviceId];
        if (!transfer) return;

        console.log(`Rejecting transfer from ${deviceId}`);
        transfer.channel.send(JSON.stringify({ type: 'REJECT' }));
        
        setPendingTransfers(prev => {
            const newState = { ...prev };
            delete newState[deviceId];
            return newState;
        });
    };

    
    const removeDevice = (deviceId) => {
        setOnlineDevices(prev => prev.filter(d => d.deviceId !== deviceId));
        
        if (peersRef.current[deviceId]) {
            peersRef.current[deviceId].close();
            delete peersRef.current[deviceId];
        }
    };

    return {
        onlineDevices,
        transferProgress,
        pendingTransfers,
        acceptTransfer,
        rejectTransfer,
        sendFile,
        connectionStatus,
        transferStats,
        removeDevice
    };
};


