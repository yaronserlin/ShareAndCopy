/**
 * Preview: client/src/components/common/Modal/Modal.test.jsx
 * Description: Test suite for ShareAndCopy functionality.
 */

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

        
        fireEvent.click(screen.getByRole('button', { name: /close/i }));
        expect(handleClose).toHaveBeenCalledTimes(1);

        
        
        
        
    });
});
