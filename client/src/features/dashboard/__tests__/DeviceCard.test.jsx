import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import DeviceCard from '../DeviceCard';

describe('DeviceCard', () => {
    const mockDevice = {
        deviceId: '123',
        deviceName: 'Test Device'
    };

    const defaultProps = {
        device: mockDevice,
        selectedFile: null,
        onFileChange: vi.fn(),
        onSend: vi.fn(),
        transferProgress: undefined
    };

    it('renders device info correctly', () => {
        render(<DeviceCard {...defaultProps} />);
        expect(screen.getByText('Test Device')).toBeInTheDocument();
        expect(screen.getByText('ID: 123')).toBeInTheDocument();
    });

    it('triggers file selection', () => {
        render(<DeviceCard {...defaultProps} />);
        // Use querySelector for file input as it might not have a label
        const fileInput = document.querySelector('input[type="file"]');
        expect(fileInput).toBeInTheDocument();
        fireEvent.change(fileInput, { target: { files: ['dummy_file'] } });
        expect(defaultProps.onFileChange).toHaveBeenCalled();
    });

    it('disables send button when no file selected', () => {
        render(<DeviceCard {...defaultProps} />);
        const sendBtn = screen.getByRole('button', { name: /send file/i });
        expect(sendBtn).toBeDisabled();
    });

    it('enables send button when file is selected', () => {
        render(<DeviceCard {...defaultProps} selectedFile={{ name: 'test.png' }} />);
        const sendBtn = screen.getByRole('button', { name: /send file/i });
        expect(sendBtn).not.toBeDisabled();
    });

    it('calls onSend when send button clicked', () => {
        render(<DeviceCard {...defaultProps} selectedFile={{ name: 'test.png' }} />);
        const sendBtn = screen.getByRole('button', { name: /send file/i });
        fireEvent.click(sendBtn);
        expect(defaultProps.onSend).toHaveBeenCalledWith('123');
    });

    it('shows progress bar during transfer', () => {
        render(<DeviceCard {...defaultProps} transferProgress={50} />);
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
        expect(screen.getByText('50%')).toBeInTheDocument();
        expect(screen.queryByText(/send file/i)).not.toBeInTheDocument();
    });

    it('shows complete message when transfer finishes', () => {
        render(<DeviceCard {...defaultProps} transferProgress={100} />);
        expect(screen.getByText(/transfer complete/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /send file/i })).toBeInTheDocument();
    });
});
