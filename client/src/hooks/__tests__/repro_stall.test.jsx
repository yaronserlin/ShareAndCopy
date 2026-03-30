/**
 * Preview: client/src/hooks/__tests__/repro_stall.test.jsx
 * Description: Test suite for ShareAndCopy functionality.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useP2P } from '../useP2P';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as SocketContext from '../../context/SocketContext';


const mockSocket = {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    id: 'socket-123'
};


const createMockDataChannel = () => {
    let listeners = {};
    return {
        onopen: null,
        onmessage: null,
        
        send: vi.fn(function (data) {
            this.bufferedAmount += (data.byteLength || 0);
            
        }),
        bufferedAmount: 0,
        bufferedAmountLowThreshold: 0,
        readyState: 'open',
        close: vi.fn(),
        addEventListener: vi.fn((event, handler) => {
            listeners[event] = handler;
        }),
        removeEventListener: vi.fn((event, handler) => {
            if (listeners[event] === handler) delete listeners[event];
        }),
        _drainBuffer: function (amount) {
            this.bufferedAmount = Math.max(0, this.bufferedAmount - amount);
            
            if (this.bufferedAmount <= this.bufferedAmountLowThreshold && listeners['bufferedamountlow']) {
                listeners['bufferedamountlow']();
            }
        }
    };
};

const mockPeerConnection = {
    createDataChannel: vi.fn(() => createMockDataChannel()),
    createOffer: vi.fn(() => Promise.resolve({ type: 'offer', sdp: 'offer-sdp' })),
    createAnswer: vi.fn(() => Promise.resolve({ type: 'answer', sdp: 'answer-sdp' })),
    setLocalDescription: vi.fn(() => Promise.resolve()),
    setRemoteDescription: vi.fn(() => Promise.resolve()),
    addIceCandidate: vi.fn(() => Promise.resolve()),
    close: vi.fn(),
    signalingState: 'stable',
    connectionState: 'connected',
    iceConnectionState: 'connected',
    onicecandidate: null,
    ondatachannel: null,
    onnegotiationneeded: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
};

global.RTCPeerConnection = vi.fn(function () { return mockPeerConnection; });
global.RTCSessionDescription = vi.fn(function (desc) { return desc; });
global.RTCIceCandidate = vi.fn(function (cand) { return cand; });
global.Blob = vi.fn(function (content) { return { content, size: content.length }; });
if (!global.URL) global.URL = {};
global.URL.createObjectURL = vi.fn();
global.URL.revokeObjectURL = vi.fn();

describe('useP2P 16KB Stall Debug', () => {
    beforeEach(() => {
        vi.spyOn(SocketContext, 'useSocket').mockReturnValue(mockSocket);
        mockPeerConnection.createDataChannel.mockClear();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it.skip('should send multiple 16KB chunks without stalling', async () => {
        let deviceOnlineHandler;
        mockSocket.on.mockImplementation((event, handler) => {
            if (event === 'device-online') deviceOnlineHandler = handler;
        });

        const { result } = renderHook(() => useP2P());

        await act(async () => {
            if (deviceOnlineHandler) {
                deviceOnlineHandler({ socketId: 'socket-target', deviceId: 'device-target', deviceName: 'Target' });
            }
        });

        
        
        const fileSize = 100 * 1024;
        const mockFile = {
            name: 'test.txt',
            size: fileSize,
            slice: (start, end) => ({
                arrayBuffer: () => Promise.resolve(new ArrayBuffer(end - start)),
                byteLength: end - start
            })
        };

        let channel;
        mockPeerConnection.createDataChannel.mockImplementationOnce(() => {
            channel = createMockDataChannel();
            channel.send = vi.fn(function (data) {
                console.log('MOCK CHANNEL SEND:', typeof data === 'string' ? data : `Binary ${data.byteLength}`);
                
                if (typeof data === 'string' && data.includes('METADATA')) {
                    
                    setTimeout(() => {
                        console.log('MOCK REPLY ACCEPT');
                        if (channel.onmessage) {
                            channel.onmessage({ data: JSON.stringify({ type: 'ACCEPT' }) });
                        }
                    }, 50);
                } else {
                    this.bufferedAmount += (data.byteLength || 0);
                }
            });
            return channel;
        });

        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        

        let drainInterval = setInterval(() => {
            if (channel && channel.bufferedAmount > 0) {
                channel._drainBuffer(20 * 1024);
            }
        }, 100);

        await act(async () => {
            const promise = result.current.sendFile(mockFile, 'device-target');
            if (channel && channel.onopen) {
                channel.onopen();
            }
            await promise;
        });

        await waitFor(() => {
            expect(channel.send).toHaveBeenCalledTimes(1 + 7); 
        }, { timeout: 5000 });

        clearInterval(drainInterval);
    });
});
