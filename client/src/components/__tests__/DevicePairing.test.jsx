/**
 * Preview: client/src/components/__tests__/DevicePairing.test.jsx
 * Description: Test suite for ShareAndCopy functionality.
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import DevicePairing from '../DevicePairing';
import { useSocket } from '../../context/SocketContext';
import axios from 'axios';


vi.mock('../../context/SocketContext');
vi.mock('axios', () => {
    const mockAxios = {
        get: vi.fn(() => Promise.resolve({ data: {} })),
        post: vi.fn(() => Promise.resolve({ data: {} })),
        interceptors: {
            request: { use: vi.fn() },
            response: { use: vi.fn() }
        },
        create: vi.fn()
    };
    mockAxios.create.mockReturnValue(mockAxios);
    return { default: mockAxios };
});

const mockSocket = {
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn()
};

useSocket.mockReturnValue(mockSocket);

describe('DevicePairing Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        
        axios.post.mockResolvedValue({ data: { code: '123456' } });
        useSocket.mockReturnValue(mockSocket);
    });

    test('renders nothing when not shown', () => {
        render(<DevicePairing show={false} onHide={() => { }} />);
        expect(screen.queryByText('Add New Device')).not.toBeInTheDocument();
    });

    test('generates pairing code on show', async () => {
        const { baseElement } = render(<DevicePairing show={true} onHide={() => { }} />);

        
        expect(baseElement.querySelector('.spinner-border')).toBeInTheDocument();

        await waitFor(() => {
            expect(axios.post).toHaveBeenCalledWith('/api/auth/pairing-code', {}, expect.any(Object));
        });

        
        await waitFor(() => {
            expect(screen.getByText('123456')).toBeInTheDocument();
        });

        expect(mockSocket.emit).toHaveBeenCalledWith('join-pairing', '123456');
    });

    test('handles confirmation request', async () => {
        render(<DevicePairing show={true} onHide={() => { }} />);

        
        await waitFor(() => expect(screen.getByText('123456')).toBeInTheDocument());

        
        
        const onCalls = mockSocket.on.mock.calls;
        const confirmCallback = onCalls.find(call => call[0] === 'confirmation-request')?.[1];

        expect(confirmCallback).toBeDefined();

        act(() => {
            confirmCallback({
                socketId: 'socket-client-id',
                deviceInfo: { model: 'Test Phone', os: 'iOS' }
            });
        });

        expect(screen.getByText(/New Device Found/i)).toBeInTheDocument();
        expect(screen.getByText(/Test Phone/i)).toBeInTheDocument();
        expect(screen.getByText('Approve')).toBeInTheDocument();
    });

    test('approves pairing request', async () => {
        const onHideMock = vi.fn();
        render(<DevicePairing show={true} onHide={onHideMock} />);

        await waitFor(() => expect(screen.getByText('123456')).toBeInTheDocument());

        const confirmCallback = mockSocket.on.mock.calls.find(call => call[0] === 'confirmation-request')?.[1];
        act(() => {
            confirmCallback({
                socketId: 'socket-client-id',
                deviceInfo: { model: 'Test Phone', os: 'iOS' }
            });
        });

        fireEvent.click(screen.getByText('Approve'));

        expect(mockSocket.emit).toHaveBeenCalledWith('approve-pairing', {
            targetSocketId: 'socket-client-id'
        });

        expect(screen.getByText(/Authorized Successfully/i)).toBeInTheDocument();

        
        
        
        
        
    });
});
