import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import GradientButton from './GradientButton';

describe('GradientButton', () => {
    it('renders button with children', () => {
        render(<GradientButton>Click Me</GradientButton>);
        expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
    });

    it('renders as link when "to" prop is present', () => {
        render(
            <MemoryRouter>
                <GradientButton to="/home">Go Home</GradientButton>
            </MemoryRouter>
        );
        const link = screen.getByRole('link', { name: /go home/i });
        expect(link).toBeInTheDocument();
        expect(link).toHaveAttribute('href', '/home');
    });

    it('calls onClick handler', () => {
        const handleClick = vi.fn();
        render(<GradientButton onClick={handleClick}>Click</GradientButton>);
        fireEvent.click(screen.getByRole('button'));
        expect(handleClick).toHaveBeenCalled();
    });

    it('is disabled when disabled prop is true', () => {
        render(<GradientButton disabled>Disabled</GradientButton>);
        expect(screen.getByRole('button')).toBeDisabled();
    });
});
