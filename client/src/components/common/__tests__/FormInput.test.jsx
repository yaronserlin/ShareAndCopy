import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import FormInput from '../FormInput';

describe('FormInput', () => {
    const defaultProps = {
        name: 'testInput',
        value: '',
        onChange: vi.fn(),
        onBlur: vi.fn(),
    };

    it('renders label when provided', () => {
        render(<FormInput {...defaultProps} label="Test Label" />);
        expect(screen.getByText('Test Label')).toBeInTheDocument();
        expect(screen.getByLabelText('Test Label')).toBeInTheDocument();
    });

    it('renders input with correct attributes', () => {
        render(<FormInput {...defaultProps} placeholder="Enter text" type="email" />);
        const input = screen.getByPlaceholderText('Enter text');
        expect(input).toHaveAttribute('type', 'email');
        expect(input).toHaveAttribute('name', 'testInput');
    });

    it('calls onChange when typed in', () => {
        render(<FormInput {...defaultProps} />);
        const input = screen.getByRole('textbox');
        fireEvent.change(input, { target: { value: 'hello' } });
        expect(defaultProps.onChange).toHaveBeenCalled();
    });

    it('shows error message when invalid', () => {
        render(<FormInput {...defaultProps} error="Invalid input" touched={true} />);
        expect(screen.getByText('Invalid input')).toBeInTheDocument();
        expect(screen.getByRole('textbox')).toHaveClass('is-invalid');
    });

    it('shows helper text when valid and helperText provided', () => {
        render(<FormInput {...defaultProps} helperText="Helper text" />);
        expect(screen.getByText('Helper text')).toBeInTheDocument();
    });

    it('does not show helper text when invalid', () => {
        render(<FormInput {...defaultProps} error="Error" touched={true} helperText="Helper text" />);
        expect(screen.getByText('Error')).toBeInTheDocument();
        expect(screen.queryByText('Helper text')).not.toBeInTheDocument();
    });
});
