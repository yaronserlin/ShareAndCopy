import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import FileList from './FileList';

describe('FileList', () => {
    const mockFiles = [
        {
            _id: '1',
            filename: 'test.txt',
            createdAt: new Date().toISOString(),
            size: 1024,
            isPublic: true
        }
    ];

    const mockHandlers = {
        onDownload: vi.fn(),
        onRename: vi.fn(),
        onDelete: vi.fn()
    };

    it('renders empty state when no files', () => {
        render(<FileList files={[]} {...mockHandlers} />);
        expect(screen.getByText(/no files shared yet/i)).toBeInTheDocument();
    });

    it('renders files when provided', () => {
        render(<FileList files={mockFiles} isOwner={true} {...mockHandlers} />);
        expect(screen.getByText('test.txt')).toBeInTheDocument();
        expect(screen.getByText(/Public/)).toBeInTheDocument();
    });

    it('displays owner actions when isOwner is true', () => {
        render(<FileList files={mockFiles} isOwner={true} {...mockHandlers} />);
        expect(screen.getByTitle('Delete')).toBeInTheDocument();
        expect(screen.getByTitle('Rename')).toBeInTheDocument();
    });

    it('hides owner actions when isOwner is false', () => {
        render(<FileList files={mockFiles} isOwner={false} {...mockHandlers} />);
        expect(screen.queryByTitle('Delete')).not.toBeInTheDocument();
        expect(screen.queryByTitle('Rename')).not.toBeInTheDocument();
    });
});
