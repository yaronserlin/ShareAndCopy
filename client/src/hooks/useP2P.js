/**
 * Core peer-to-peer file transfer hook. Manages the WebRTC signaling
 * handshake over the shared socket (using a "perfect negotiation" pattern
 * to resolve offer/answer glare between two equal peers), tracks which
 * devices are online, and streams files directly between devices over
 * RTCDataChannels in fixed-size chunks with backpressure-aware flow
 * control.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useSocket } from '../context/SocketContext';
import { getDeviceId } from '../utils/deviceUtils';
import { APP_CONSTANTS } from '../constants';
import API_BASE_URL from '../config';
import { debugLog, debugWarn } from '../utils/logger';

/** Fallback STUN servers used until the server-provided ICE config loads. */
const DEFAULT_ICE_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
];

/** Size, in bytes, of each chunk streamed over the data channel. */
const CHUNK_SIZE = 16 * 1024;
/** Largest file, in bytes, that a transfer will accept. */
const MAX_FILE_SIZE = 500 * 1024 * 1024;
/** Maximum number of in-flight receive transfers tracked per peer connection at once. */
const MAX_CONCURRENT_TRANSFERS_PER_PEER = 5;
/** How long to wait for a FINISH message before abandoning a tracked receive transfer. */
const TRANSFER_TIMEOUT_MS = 60 * 1000;

/**
 * Generates a UUID, preferring `crypto.randomUUID` and falling back to a
 * `Math.random`-based v4 UUID where that API is unavailable.
 *
 * @returns {string} A UUID string.
 */
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

/**
 * Sanitizes a (potentially attacker-controlled) filename before it is used
 * as a browser download name: strips path separators and control
 * characters and caps the length.
 *
 * @param {string} name
 * @returns {string}
 */
const sanitizeFileName = (name) => {
    // eslint-disable-next-line no-control-regex -- intentionally stripping control characters
    return name.replace(/[/\\]/g, '_').replace(/[\x00-\x1f]/g, '').slice(0, 255);
};

/**
 * Sets up peer-to-peer device discovery and file transfer over the
 * shared socket connection.
 *
 * @returns {{
 *   onlineDevices: Array<Object>,
 *   transferProgress: Object<string, number>,
 *   pendingTransfers: Object<string, Object>,
 *   acceptTransfer: (deviceId: string) => void,
 *   rejectTransfer: (deviceId: string) => void,
 *   sendFile: (file: File, targetDeviceId: string) => Promise<void>,
 *   connectionStatus: Object<string, string>,
 *   transferStats: Object<string, {speed: string, eta: string}>,
 *   removeDevice: (deviceId: string) => void
 * }}
 */
export const useP2P = () => {
    const socket = useSocket();
    const [onlineDevices, setOnlineDevices] = useState([]);
    /** Per-device receive/send progress percentage. */
    const [transferProgress, setTransferProgress] = useState({});
    /** Per-device transfer speed/ETA, updated while sending. */
    const [transferStats, setTransferStats] = useState({});
    /** Per-device incoming transfer awaiting accept/reject. */
    const [pendingTransfers, setPendingTransfers] = useState({});
    /** Per-device ICE connection status. */
    const [connectionStatus, setConnectionStatus] = useState({});

    const progressUpdateScheduled = useRef(false);
    const pendingProgressUpdates = useRef({});

    /** Object URLs created for received files, revoked after download. */
    const objectURLsRef = useRef(new Set());

    /** Active RTCPeerConnections, keyed by remote device ID. */
    const peersRef = useRef({});

    /** ICE candidates buffered until the remote description is set. */
    const candidatesBufferRef = useRef({});

    const iceServersRef = useRef({ iceServers: DEFAULT_ICE_SERVERS });

    const onlineDevicesRef = useRef([]);

    /** Perfect-negotiation state per remote device; see {@link getOrCreatePeer}. */
    const negotiationStateRef = useRef({});

    const myDeviceIdRef = useRef(getDeviceId());

    useEffect(() => {
        onlineDevicesRef.current = onlineDevices;
    }, [onlineDevices]);

    /**
     * Tears down all connection state associated with a device: closes
     * its peer connection and clears its buffered candidates, negotiation
     * state, and per-device transfer/progress/status entries.
     *
     * @param {string} deviceId
     */
    const cleanupDeviceState = useCallback((deviceId) => {
        if (peersRef.current[deviceId]) {
            peersRef.current[deviceId].close();
            delete peersRef.current[deviceId];
        }
        delete candidatesBufferRef.current[deviceId];
        delete negotiationStateRef.current[deviceId];

        const dropKey = (prev) => {
            if (!(deviceId in prev)) return prev;
            const next = { ...prev };
            delete next[deviceId];
            return next;
        };

        setTransferProgress(dropKey);
        setTransferStats(dropKey);
        setPendingTransfers(dropKey);
        setConnectionStatus(dropKey);
    }, []);

    /**
     * Batches per-device progress updates into a single state update per
     * animation frame, avoiding a re-render for every chunk received.
     *
     * @param {string} deviceId
     * @param {number} progress - Percentage complete (0-100).
     */
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

    /** Fetches the server-configured ICE (STUN/TURN) servers once on mount. */
    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const res = await axios.get(`${API_BASE_URL}/system/webrtc-config`);
                if (res.data && res.data.data && res.data.data.iceServers) {
                    iceServersRef.current = { iceServers: res.data.data.iceServers };
                    debugLog('WebRTC Configuration Loaded:', iceServersRef.current);
                }
            } catch (err) {
                console.error('Failed to fetch WebRTC config, using default STUN:', err);
            }
        };
        fetchConfig();
    }, []);

    /**
     * Attaches handlers to an incoming RTCDataChannel: parses the JSON
     * control messages (`METADATA`, `FINISH`) and raw binary chunks that
     * make up a receive-side file transfer, reassembling the file and
     * triggering a browser download once all chunks have arrived.
     *
     * Wrapped in `useCallback` (rather than being a plain function) so it
     * has a stable identity that `getOrCreatePeer` and the main signaling
     * effect can safely depend on without re-running on every render.
     *
     * @param {RTCDataChannel} channel
     * @param {string} deviceId - ID of the sending device.
     */
    const setupReceiveChannel = useCallback((channel, deviceId) => {
        /** Transfers in flight on this channel, keyed by transfer ID. */
        const activeTransfers = new Map();
        let currentTransferId = null;

        const clearTransferTimeout = (transfer) => {
            if (transfer && transfer.timeoutId) {
                clearTimeout(transfer.timeoutId);
            }
        };

        const dropDeviceState = () => {
            setTransferProgress(prev => {
                if (!(deviceId in prev)) return prev;
                const next = { ...prev };
                delete next[deviceId];
                return next;
            });
            setPendingTransfers(prev => {
                if (!(deviceId in prev)) return prev;
                const next = { ...prev };
                delete next[deviceId];
                return next;
            });
        };

        const abortActiveTransfer = () => {
            if (activeTransfers.size === 0) return;
            activeTransfers.forEach(clearTransferTimeout);
            activeTransfers.clear();
            dropDeviceState();
        };

        channel.onopen = () => debugLog(`Data Channel Opened (Receiver) for ${deviceId}`);
        channel.onclose = () => {
            debugLog(`Data Channel Closed (Receiver) for ${deviceId}`);
            abortActiveTransfer();
        };
        channel.onerror = (e) => {
            console.error(`Data Channel Error (Receiver) for ${deviceId}:`, e);
            toast.error('File transfer connection error.');
            abortActiveTransfer();
        };

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

                        const fileName = message.fileName || '';
                        const dotIndex = fileName.lastIndexOf('.');
                        const extension = dotIndex >= 0 ? fileName.slice(dotIndex).toLowerCase() : '';
                        if (APP_CONSTANTS.FORBIDDEN_EXTENSIONS.includes(extension)) {
                            console.error(`Blocked forbidden incoming file extension: ${extension}`);
                            toast.error(`Files of type "${extension}" are not allowed.`);
                            return;
                        }

                        if (activeTransfers.size >= MAX_CONCURRENT_TRANSFERS_PER_PEER) {
                            console.error(`Too many concurrent transfers from ${deviceId}`);
                            toast.error('Too many simultaneous transfers from this device.');
                            return;
                        }

                        const transferId = message.transferId || crypto.randomUUID();
                        currentTransferId = transferId;

                        debugLog(`Receiving file offer [${transferId}]: ${message.fileName} (${message.fileSize} bytes)`);

                        const timeoutId = setTimeout(() => {
                            if (!activeTransfers.has(transferId)) return;
                            console.error(`Transfer [${transferId}] timed out waiting for FINISH`);
                            activeTransfers.delete(transferId);
                            dropDeviceState();
                            toast.error('File transfer timed out.');
                        }, TRANSFER_TIMEOUT_MS);

                        activeTransfers.set(transferId, {
                            fileMeta: message,
                            receivedBuffers: [],
                            receivedSize: 0,
                            timeoutId
                        });

                        setPendingTransfers(prev => ({
                            ...prev,
                            [deviceId]: {
                                fileName: message.fileName,
                                fileSize: message.fileSize,
                                deviceName: onlineDevicesRef.current.find(d => d.deviceId === deviceId)?.deviceName || 'Unknown Device',
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

                        clearTransferTimeout(transfer);

                        debugLog(`File Transfer Complete [${transferId}]. Reassembling...`);
                        const blob = new Blob(transfer.receivedBuffers);
                        const url = URL.createObjectURL(blob);

                        objectURLsRef.current.add(url);

                        const a = document.createElement('a');
                        a.href = url;
                        a.download = sanitizeFileName(transfer.fileMeta.fileName);
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
            } else {
                const transfer = activeTransfers.get(currentTransferId);

                if (!transfer) {
                    console.error('Received chunk for unknown transfer');
                    return;
                }

                if (transfer.receivedSize + data.byteLength > MAX_FILE_SIZE) {
                    console.error('Transfer exceeded max limits during reception.');
                    channel.close();
                    clearTransferTimeout(transfer);
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
    }, [socket, updateProgress]);

    /**
     * Returns the existing peer connection for a device, or creates one
     * and wires up its ICE candidate, data channel, and renegotiation
     * handlers. Each side's "polite"/"impolite" role for perfect
     * negotiation is derived deterministically by comparing device IDs.
     *
     * @param {string} targetDeviceId
     * @param {string} targetSocketId
     * @returns {RTCPeerConnection}
     */
    const getOrCreatePeer = useCallback((targetDeviceId, targetSocketId) => {
        if (peersRef.current[targetDeviceId]) {
            const p = peersRef.current[targetDeviceId];
            debugLog(`Using existing peer for ${targetDeviceId}. ConnectionState: ${p.connectionState}`);
            return p;
        }

        debugLog(`Creating new RTCPeerConnection for ${targetDeviceId}`);
        const peer = new RTCPeerConnection(iceServersRef.current);
        peersRef.current[targetDeviceId] = peer;

        negotiationStateRef.current[targetDeviceId] = {
            making: false,
            ignoreOffer: false,
            polite: myDeviceIdRef.current > targetDeviceId
        };

        setConnectionStatus(prev => ({ ...prev, [targetDeviceId]: 'checking' }));

        peer.oniceconnectionstatechange = () => {
            debugLog(`ICE Connection State Change (${targetDeviceId}):`, peer.iceConnectionState);
            const state = peer.iceConnectionState;

            if (state === 'failed' || state === 'closed') {
                const deviceName = onlineDevicesRef.current.find(d => d.deviceId === targetDeviceId)?.deviceName || 'device';
                toast.error(`Connection to ${deviceName} failed.`);
                cleanupDeviceState(targetDeviceId);
                return;
            }

            let status = 'checking';
            if (state === 'connected' || state === 'completed') status = 'connected';
            else if (state === 'disconnected') status = 'disconnected';

            setConnectionStatus(prev => ({ ...prev, [targetDeviceId]: status }));
        };

        peer.onconnectionstatechange = () => {
            debugLog(`Peer Connection State Change (${targetDeviceId}):`, peer.connectionState);
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
            debugLog(`Received Data Channel from ${targetDeviceId}`);
            const channel = event.channel;
            setupReceiveChannel(channel, targetDeviceId);
        };

        peer.onnegotiationneeded = async () => {
            debugLog('Negotiation Needed for', targetDeviceId);
            const state = negotiationStateRef.current[targetDeviceId];
            try {
                state.making = true;
                const offer = await peer.createOffer();
                await peer.setLocalDescription(offer);
                debugLog('Sending Offer...');
                socket.emit('signal', {
                    targetSocketId,
                    type: 'offer',
                    signalData: offer
                });
            } catch (err) {
                console.error('Error during negotiation:', err);
            } finally {
                state.making = false;
            }
        };

        return peer;
    }, [socket, setupReceiveChannel, cleanupDeviceState]);

    /**
     * Wires up all socket event listeners for device presence and WebRTC
     * signaling ("perfect negotiation": each peer decides whether it is
     * "polite" or "impolite" based on device ID ordering, so offer/answer
     * glare between two simultaneous offers resolves deterministically),
     * and cleans up peers, buffered candidates, and object URLs on
     * unmount or socket change.
     */
    useEffect(() => {
        if (!socket) return;

        socket.on('initial-device-list', (devices) => {
            debugLog('Received initial device list:', devices);
            setOnlineDevices(devices);
        });

        socket.on('device-online', (device) => {
            debugLog('Device Online:', device);
            setOnlineDevices(prev => {
                if (prev.find(d => d.deviceId === device.deviceId)) return prev;
                return [...prev, device];
            });
        });

        socket.on('device-offline', ({ deviceId }) => {
            debugLog('Device Offline:', deviceId);
            setOnlineDevices(prev => prev.filter(d => d.deviceId !== deviceId));
            cleanupDeviceState(deviceId);
        });

        socket.on('signal', async ({ senderSocketId, senderDeviceId, type, signalData }) => {
            debugLog(`Received Signal from ${senderDeviceId} (${type})`);

            const peer = getOrCreatePeer(senderDeviceId, senderSocketId);

            try {
                if (type === 'offer') {
                    const state = negotiationStateRef.current[senderDeviceId];
                    const offerCollision = state.making || peer.signalingState !== 'stable';

                    state.ignoreOffer = !state.polite && offerCollision;
                    if (state.ignoreOffer) {
                        debugWarn(`Glare detected with ${senderDeviceId}; ignoring offer (impolite peer)`);
                        return;
                    }

                    if (offerCollision) {
                        debugWarn(`Glare detected with ${senderDeviceId}; rolling back local offer (polite peer)`);
                        await peer.setLocalDescription({ type: 'rollback' });
                    }

                    await peer.setRemoteDescription(new RTCSessionDescription(signalData));
                    debugLog('Remote Description Set (Offer)');

                    if (candidatesBufferRef.current[senderDeviceId]) {
                        debugLog(`Processing ${candidatesBufferRef.current[senderDeviceId].length} buffered candidates for ${senderDeviceId}`);
                        for (const candidate of candidatesBufferRef.current[senderDeviceId]) {
                            await peer.addIceCandidate(candidate);
                        }
                        delete candidatesBufferRef.current[senderDeviceId];
                    }

                    const answer = await peer.createAnswer();
                    await peer.setLocalDescription(answer);
                    debugLog('Local Description Set (Answer), Sending Answer...');

                    socket.emit('signal', {
                        targetSocketId: senderSocketId,
                        type: 'answer',
                        signalData: answer
                    });
                } else if (type === 'answer') {
                    await peer.setRemoteDescription(new RTCSessionDescription(signalData));
                    debugLog('Remote Description Set (Answer)');

                    if (candidatesBufferRef.current[senderDeviceId]) {
                        debugLog(`Processing ${candidatesBufferRef.current[senderDeviceId].length} buffered candidates for ${senderDeviceId}`);
                        for (const candidate of candidatesBufferRef.current[senderDeviceId]) {
                            await peer.addIceCandidate(candidate);
                        }
                        delete candidatesBufferRef.current[senderDeviceId];
                    }
                } else if (type === 'candidate') {
                    const candidate = new RTCIceCandidate(signalData);
                    if (peer.remoteDescription && peer.remoteDescription.type) {
                        await peer.addIceCandidate(candidate);
                        debugLog('Added ICE Candidate immediately');
                    } else {
                        debugLog('Buffering ICE Candidate (Remote Desc not ready)');
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
    }, [socket, cleanupDeviceState, getOrCreatePeer]);

    /**
     * Streams a file across an open RTCDataChannel in fixed-size chunks,
     * pausing whenever the channel's send buffer exceeds a threshold
     * (backpressure) and resuming once it drains, while periodically
     * reporting transfer speed and ETA.
     *
     * @param {RTCDataChannel} channel
     * @param {File} file
     * @param {string} targetDeviceId
     * @returns {Promise<void>}
     */
    const sendChunks = async (channel, file, targetDeviceId) => {
        const MAX_BUFFERED_AMOUNT = 64 * 1024;
        channel.bufferedAmountLowThreshold = MAX_BUFFERED_AMOUNT / 2;

        let offset = 0;

        const startTime = Date.now();
        let lastStatTime = startTime;
        let lastByteCount = 0;
        let logCounter = 0;

        while (offset < file.size) {
            if (channel.bufferedAmount > MAX_BUFFERED_AMOUNT) {
                debugLog(`[Send] Buffer full (${channel.bufferedAmount}). Waiting...`);
                await new Promise(resolve => {
                    let resolved = false;
                    const finish = () => {
                        if (resolved) return;
                        resolved = true;
                        channel.removeEventListener('bufferedamountlow', onLowBuffer);
                        channel.removeEventListener('close', finish);
                        channel.removeEventListener('error', finish);
                        clearInterval(polling);
                        resolve();
                    };

                    const onLowBuffer = () => finish();

                    channel.addEventListener('bufferedamountlow', onLowBuffer);
                    channel.addEventListener('close', finish);
                    channel.addEventListener('error', finish);

                    const polling = setInterval(() => {
                        if (channel.readyState !== 'open' || channel.bufferedAmount <= channel.bufferedAmountLowThreshold) {
                            finish();
                        }
                    }, 200);
                });
                debugLog(`[Send] Buffer drained (${channel.bufferedAmount}). Resuming.`);
            }

            if (channel.readyState !== 'open') {
                console.error('[Send] Channel closed unexpectedly');
                break;
            }

            const currentChunkSize = Math.min(CHUNK_SIZE, file.size - offset);
            const chunk = file.slice(offset, offset + currentChunkSize);
            const buffer = await chunk.arrayBuffer();

            try {
                channel.send(buffer);
                logCounter++;
                if (logCounter % 50 === 0) {
                    debugLog(`[Send] Sent chunk ${logCounter}. Offset: ${offset}/${file.size}. Buffer: ${channel.bufferedAmount}`);
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

        setTransferProgress(prev => {
            if (!(targetDeviceId in prev)) return prev;
            const next = { ...prev };
            delete next[targetDeviceId];
            return next;
        });
    };

    /**
     * Initiates a file transfer to an online device: opens a new
     * RTCDataChannel, sends file metadata, waits for the receiver's
     * accept/reject response, and streams the file on acceptance.
     * Rejects files with a forbidden extension before any connection is made.
     *
     * @param {File} file
     * @param {string} targetDeviceId
     * @returns {Promise<void>}
     */
    const sendFile = async (file, targetDeviceId) => {
        if (!socket || !socket.connected) {
            console.error('Cannot send file: Socket not connected');
            toast.error('Connection lost. Please refresh.');
            return;
        }

        const targetDevice = onlineDevices.find(d => d.deviceId === targetDeviceId);

        if (!targetDevice) {
            console.error('Target device not online or not found');
            toast.error('Target device not reachable');
            return;
        }

        const dotIndex = file.name.lastIndexOf('.');
        const extension = dotIndex >= 0 ? file.name.slice(dotIndex).toLowerCase() : '';
        if (APP_CONSTANTS.FORBIDDEN_EXTENSIONS.includes(extension)) {
            console.error(`Blocked forbidden file extension: ${extension}`);
            toast.error(`Files of type "${extension}" are not allowed.`);
            return;
        }

        const targetSocketId = targetDevice.socketId;
        debugLog(`Initiating File Transfer to ${targetDeviceId} (Socket: ${targetSocketId})`);

        // Ask the server to notify the receiving device. The transfer
        // itself never touches the server, so without this the other
        // device only learns about the file if its app happens to be
        // open and in front of someone.
        socket.emit('notify-transfer', {
            targetDeviceId,
            fileName: file.name
        });

        const peer = getOrCreatePeer(targetDeviceId, targetSocketId);
        const channel = peer.createDataChannel('file-transfer');

        channel.onopen = async () => {
            debugLog(`Data Channel Opened (Sender) for ${targetDeviceId}. Starting Transfer...`);

            const transferId = generateUUID();

            const metadata = {
                type: 'METADATA',
                fileName: file.name,
                fileSize: file.size,
                chunkCount: Math.ceil(file.size / CHUNK_SIZE),
                transferId
            };
            channel.send(JSON.stringify(metadata));
            debugLog(`Metadata sent with transfer ID: ${transferId}. Waiting for acceptance...`);

            channel.onmessage = async (event) => {
                const data = event.data;
                if (typeof data === 'string') {
                    try {
                        const message = JSON.parse(data);
                        if (message.type === 'ACCEPT') {
                            debugLog('Transfer Accepted by receiver. Starting Send...');
                            await sendChunks(channel, file, targetDeviceId);

                            if (channel.readyState === 'open') {
                                channel.send(JSON.stringify({ type: 'FINISH', transferId }));
                                debugLog(`File Transfer Finished (Sender side) [${transferId}]`);

                                socket.emit('report-transfer', { size: file.size, type: 'upload' });
                            }
                        } else if (message.type === 'REJECT') {
                            debugLog('Transfer Rejected by receiver.');
                            toast.error('File transfer declined by the recipient.');
                            channel.close();
                        }
                    } catch (e) {
                        console.error('Error handling sender response', e);
                    }
                }
            };
        };

        channel.onclose = () => {
            debugLog('Data Channel Closed (Sender)');
            setTransferStats(prev => {
                if (!(targetDeviceId in prev)) return prev;
                const next = { ...prev };
                delete next[targetDeviceId];
                return next;
            });
        };
        channel.onerror = (e) => {
            console.error('Data Channel Error:', e);
            toast.error('File transfer connection error.');
            setTransferProgress(prev => {
                if (!(targetDeviceId in prev)) return prev;
                const next = { ...prev };
                delete next[targetDeviceId];
                return next;
            });
            setTransferStats(prev => {
                if (!(targetDeviceId in prev)) return prev;
                const next = { ...prev };
                delete next[targetDeviceId];
                return next;
            });
        };
    };

    /**
     * Accepts a pending incoming transfer, signaling the sender to begin
     * streaming chunks.
     *
     * @param {string} deviceId - Device the pending transfer is from.
     */
    const acceptTransfer = (deviceId) => {
        const transfer = pendingTransfers[deviceId];
        if (!transfer) return;

        debugLog(`Accepting transfer from ${deviceId}`);
        transfer.channel.send(JSON.stringify({ type: 'ACCEPT' }));

        setPendingTransfers(prev => {
            const newState = { ...prev };
            delete newState[deviceId];
            return newState;
        });

        setTransferProgress(prev => ({ ...prev, [deviceId]: 0 }));
    };

    /**
     * Declines a pending incoming transfer, signaling the sender to stop.
     *
     * @param {string} deviceId - Device the pending transfer is from.
     */
    const rejectTransfer = (deviceId) => {
        const transfer = pendingTransfers[deviceId];
        if (!transfer) return;

        debugLog(`Rejecting transfer from ${deviceId}`);
        transfer.channel.send(JSON.stringify({ type: 'REJECT' }));
        setPendingTransfers(prev => {
            const newState = { ...prev };
            delete newState[deviceId];
            return newState;
        });
    };

    /**
     * Removes a device from the online list and tears down its
     * connection state, e.g. after the user revokes its access.
     *
     * @param {string} deviceId
     */
    const removeDevice = (deviceId) => {
        setOnlineDevices(prev => prev.filter(d => d.deviceId !== deviceId));
        cleanupDeviceState(deviceId);
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

