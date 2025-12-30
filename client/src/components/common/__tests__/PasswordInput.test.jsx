import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import PasswordInput from '../PasswordInput';

describe('PasswordInput', () => {
    const defaultProps = {
        name: 'password',
        value: '',
        onChange: vi.fn(),
        onBlur: vi.fn(),
    };

    it('renders with password type by default', () => {
        render(<PasswordInput {...defaultProps} label="Password" />);
        // By default it should hide value, so we look for the input associated with label
        const input = screen.getByLabelText('Password');
        expect(input).toHaveAttribute('type', 'password');
    });

    it('toggles password visibility', () => {
        render(<PasswordInput {...defaultProps} label="Password" />);
        const input = screen.getByLabelText('Password');
        const toggleButton = screen.getByRole('button');

        // Initially password
        expect(input).toHaveAttribute('type', 'password');

        // Click to show
        fireEvent.click(toggleButton);
        expect(input).toHaveAttribute('type', 'text');

        // Click to hide
        fireEvent.click(toggleButton);
        expect(input).toHaveAttribute('type', 'password');
    });

    it('shows error message when touched and error exists', () => {
        render(<PasswordInput {...defaultProps} error="Password required" touched={true} />);
        expect(screen.getByText('Password required')).toBeInTheDocument();
    });
});
