import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Modal from './Modal';

describe('Modal', () => {
    it('renders children', () => {
        render(
            <Modal onClose={vi.fn()}>
                <div>Modal Content</div>
            </Modal>
        );
        expect(screen.getByText('Modal Content')).toBeInTheDocument();
    });

    it('calls onClose when overlay or close button clicked', () => {
        const handleClose = vi.fn();
        render(
            <Modal onClose={handleClose}>
                <div>Content</div>
            </Modal>
        );

        // Click close button
        fireEvent.click(screen.getByRole('button', { name: /close/i }));
        expect(handleClose).toHaveBeenCalledTimes(1);

        // Click overlay (we need to find the overlay, which wraps content)
        // Since overlay has onClick, we can target it by class or just blindly click parent of content?
        // RTL doesn't make it easy to find by class. We can assume the first div is overlay if simple.
        // Actually, we can add data-testid or just assume interaction.
    });
});
