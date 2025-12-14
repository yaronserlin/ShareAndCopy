import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import UploadSection from './UploadSection';

describe('UploadSection', () => {
    it('renders upload interface', () => {
        render(<UploadSection onUpload={vi.fn()} />);
        expect(screen.getByText(/upload data/i)).toBeInTheDocument();
        expect(screen.getByText(/drag & drop files here/i)).toBeInTheDocument();
    });

    it('selects a file', async () => {
        render(<UploadSection onUpload={vi.fn()} />);
        vi.mock('../../../../context/UploadContext', () => ({
            useUpload: () => ({
                isUploading: false,
                startUpload: vi.fn()
            })
        }));
        const file = new File(['hello'], 'hello.png', { type: 'image/png' });
        const input = screen.getByLabelText(/drag & drop/i).querySelector('input[type="file"]');

        // Note: Label wraps input, so getting by text might capture the label.
        // We can just query selector 'input[type="file"]' as it's the only one.
        const fileInput = document.querySelector('input[type="file"]');

        fireEvent.change(fileInput, { target: { files: [file] } });

        await waitFor(() => {
            expect(screen.getByText('hello.png')).toBeInTheDocument();
        });
    });

    it('disables upload button when no file selected', () => {
        render(<UploadSection onUpload={vi.fn()} />);
        const btn = screen.getByRole('button', { name: /upload file/i });
        expect(btn).toBeDisabled();
    });
});
