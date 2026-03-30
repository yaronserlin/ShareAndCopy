/**
 * Preview: client/src/components/common/__tests__/PasswordInput.test.jsx
 * Description: Test suite for ShareAndCopy functionality.
 */

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
        
        const input = screen.getByLabelText('Password');
        expect(input).toHaveAttribute('type', 'password');
    });

    it('toggles password visibility', () => {
        render(<PasswordInput {...defaultProps} label="Password" />);
        const input = screen.getByLabelText('Password');
        const toggleButton = screen.getByRole('button');

        
        expect(input).toHaveAttribute('type', 'password');

        
        fireEvent.click(toggleButton);
        expect(input).toHaveAttribute('type', 'text');

        
        fireEvent.click(toggleButton);
        expect(input).toHaveAttribute('type', 'password');
    });

    it('shows error message when touched and error exists', () => {
        render(<PasswordInput {...defaultProps} error="Password required" touched={true} />);
        expect(screen.getByText('Password required')).toBeInTheDocument();
    });
});
