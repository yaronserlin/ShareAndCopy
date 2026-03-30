/**
 * Preview: client/src/hooks/__tests__/useP2P.test.jsx
 * Description: Test suite for ShareAndCopy functionality.
 */

import { renderHook, act } from '@testing-library/react';
import { useP2P } from '../useP2P';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as SocketContext from '../../context/SocketContext';


const mockSocket = {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    id: 'socket-123'
};


const mockPeerConnection = {
    createDataChannel: vi.fn(() => ({
        onopen: null,
        onmessage: null,
        send: vi.fn(),
        bufferedAmount: 0,
        readyState: 'open', 
        close: vi.fn(),
    })),
    createOffer: vi.fn(() => Promise.resolve({ type: 'offer', sdp: 'offer-sdp' })),
    createAnswer: vi.fn(() => Promise.resolve({ type: 'answer', sdp: 'answer-sdp' })),
    setLocalDescription: vi.fn(() => Promise.resolve()),
    setRemoteDescription: vi.fn(() => Promise.resolve()),
    addIceCandidate: vi.fn(() => Promise.resolve()),
    close: vi.fn(),
    signalingState: 'stable',
    connectionState: 'new',
    iceConnectionState: 'new',
    onicecandidate: null,
    ondatachannel: null,
    onnegotiationneeded: null,
    oniceconnectionstatechange: null,
    onconnectionstatechange: null
};


global.RTCPeerConnection = vi.fn(function () {
    return mockPeerConnection;
});
global.RTCSessionDescription = vi.fn(function (desc) { return desc; });
global.RTCIceCandidate = vi.fn(function (cand) { return cand; });
global.Blob = vi.fn((content) => ({ content, size: content.length }));
global.URL = { createObjectURL: vi.fn(), revokeObjectURL: vi.fn() };

describe('useP2P Hook', () => {
    beforeEach(() => {
        vi.spyOn(SocketContext, 'useSocket').mockReturnValue(mockSocket);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('should initialize and listen to socket events', () => {
        renderHook(() => useP2P());
        expect(mockSocket.on).toHaveBeenCalledWith('initial-device-list', expect.any(Function));
        expect(mockSocket.on).toHaveBeenCalledWith('device-online', expect.any(Function));
        expect(mockSocket.on).toHaveBeenCalledWith('device-offline', expect.any(Function));
        expect(mockSocket.on).toHaveBeenCalledWith('signal', expect.any(Function));
    });

    it('should send file and trigger signaling', async () => {
        
        let deviceOnlineHandler;
        mockSocket.on.mockImplementation((event, handler) => {
            if (event === 'device-online') deviceOnlineHandler = handler;
        });

        const { result } = renderHook(() => useP2P());

        
        const targetDeviceId = 'device-target';
        await act(async () => {
            if (deviceOnlineHandler) {
                deviceOnlineHandler({
                    socketId: 'socket-target',
                    deviceId: targetDeviceId,
                    deviceName: 'Target Device'
                });
            }
        });

        
        const mockFile = new File(['hello world'], 'test.txt', { type: 'text/plain' });

        await act(async () => {
            await result.current.sendFile(mockFile, targetDeviceId);
        });

        
        expect(global.RTCPeerConnection).toHaveBeenCalled();

        
        expect(mockPeerConnection.createDataChannel).toHaveBeenCalledWith('file-transfer');

        
        
        
        
        

        if (mockPeerConnection.onnegotiationneeded) {
            await act(async () => {
                await mockPeerConnection.onnegotiationneeded();
            });
            expect(mockPeerConnection.createOffer).toHaveBeenCalled();
            expect(mockSocket.emit).toHaveBeenCalledWith('signal', expect.objectContaining({
                targetSocketId: 'socket-target',
                type: 'offer'
            }));
        }
    });

    it('should handle incoming signal (offer)', async () => {
        let signalHandler;
        mockSocket.on.mockImplementation((event, handler) => {
            if (event === 'signal') signalHandler = handler;
        });

        renderHook(() => useP2P());

        
        await act(async () => {
            await signalHandler({
                senderDeviceId: 'device-sender',
                senderSocketId: 'socket-sender',
                type: 'offer',
                signalData: { type: 'offer', sdp: 'remote-offer' }
            });
        });

        
        expect(mockPeerConnection.setRemoteDescription).toHaveBeenCalledWith({ type: 'offer', sdp: 'remote-offer' });
        
        expect(mockPeerConnection.createAnswer).toHaveBeenCalled();
        expect(mockSocket.emit).toHaveBeenCalledWith('signal', expect.objectContaining({
            type: 'answer'
        }));
    });
});
