import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import PairingLogin from '../PairingLogin';
import axios from 'axios';
import io from 'socket.io-client';

import { AuthProvider } from '../../context/AuthContext';

// Mock dependencies
vi.mock('axios');
vi.mock('socket.io-client');
vi.mock('../../context/AuthContext', () => ({
    useAuth: () => ({ login: vi.fn() }),
    AuthProvider: ({ children }) => <div>{children}</div>
}));

const mockSocket = {
    on: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
    connect: vi.fn()
};

io.mockReturnValue(mockSocket);

describe('PairingLogin Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Setup socket mocks to chainable or functional?
        // simple mocks are fine
    });

    test('renders input form initially', () => {
        render(
            <BrowserRouter>
                <PairingLogin onCancel={vi.fn()} />
            </BrowserRouter>
        );
        expect(screen.getByPlaceholderText('6-Digit Code')).toBeInTheDocument();
        expect(screen.getByText('Request Pairing')).toBeInTheDocument();
    });

    test('handles input change', () => {
        render(
            <BrowserRouter>
                <PairingLogin onCancel={vi.fn()} />
            </BrowserRouter>
        );
        const input = screen.getByPlaceholderText('6-Digit Code');
        fireEvent.change(input, { target: { value: 'abc123' } });
        expect(input.value).toBe('ABC123'); // Uppercase enforced
    });

    test('submits valid code and connects', async () => {
        // Mock successful verify
        axios.post.mockResolvedValue({
            data: { valid: true, pairingToken: 'temp-token' }
        });

        render(
            <BrowserRouter>
                <PairingLogin onCancel={vi.fn()} />
            </BrowserRouter>
        );

        const input = screen.getByPlaceholderText('6-Digit Code');
        fireEvent.change(input, { target: { value: '123456' } });
        fireEvent.click(screen.getByText('Request Pairing'));

        await waitFor(() => {
            expect(axios.post).toHaveBeenCalledWith('/api/auth/verify-pairing', { code: '123456' });
        });

        expect(io).toHaveBeenCalled();
        // Wait for connection simulation
        // The component subscribes to socket.on('connect'). We must trigger it manually?

        // In this mock, we can inspect calls.
        const onConnect = mockSocket.on.mock.calls.find(call => call[0] === 'connect')?.[1];
        if (onConnect) {
            await act(async () => {
                onConnect();
            });
        }

        // Should emit request-pairing
        await waitFor(() => {
            expect(mockSocket.emit).toHaveBeenCalledWith('request-pairing', expect.objectContaining({
                code: '123456'
            }));
        });

        expect(screen.getByText(/Waiting for approval/i)).toBeInTheDocument();
    });

    test('handles invalid code error', async () => {
        axios.post.mockResolvedValue({
            data: { valid: false }
        });

        render(
            <BrowserRouter>
                <PairingLogin onCancel={vi.fn()} />
            </BrowserRouter>
        );

        const input = screen.getByPlaceholderText('6-Digit Code');
        fireEvent.change(input, { target: { value: '123456' } });
        fireEvent.click(screen.getByText('Request Pairing'));

        await waitFor(() => {
            // Expect error message
            expect(screen.getByText(/Failed to verify code/i)).toBeInTheDocument();
        });

        expect(screen.queryByText(/check your logged-in device/i)).not.toBeInTheDocument();

        // Actually component logic:
        /*
            if (!res.data.valid || !res.data.pairingToken) {
                throw new Error('Invalid code');
        */

        await waitFor(() => {
            // We expect an error alert. But relying on generic error handling might show "Failed to verify code."
            // The text might vary, let's look for error alert class or partial text
            // Error state is displayed in Alert variant="danger"
        });

        // Note: 'Invalid code' from throw might be caught and set as error
    });
});
