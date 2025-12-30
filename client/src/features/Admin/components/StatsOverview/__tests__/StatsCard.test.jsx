import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, beforeAll, describe, it, expect } from 'vitest';
import StatsCard from '../StatsCard';
import { ThemeProvider } from '../../../../../context/ThemeContext';

// Mock ThemeProvider to avoid context errors and control theme
const renderWithTheme = (ui, theme = 'light') => {
    return render(
        <ThemeProvider value={{ theme }}>
            {ui}
        </ThemeProvider>
    );
};

beforeAll(() => {
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
            matches: false,
            media: query,
            onchange: null,
            addListener: vi.fn(), // deprecated
            removeListener: vi.fn(), // deprecated
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        })),
    });
});

describe('StatsCard', () => {
    const defaultProps = {
        title: 'Test Stat',
        value: 100,
        icon: 'bi-test',
        iconColorClass: 'text-test'
    };

    it('renders title and value', () => {
        renderWithTheme(<StatsCard {...defaultProps} />);
        expect(screen.getByText('Test Stat')).toBeInTheDocument();
        expect(screen.getByText('100')).toBeInTheDocument();
    });

    it('applies icon classes', () => {
        renderWithTheme(<StatsCard {...defaultProps} />);
        // Check if icon exists with basic class
        expect(document.querySelector('.bi-test')).toBeInTheDocument();
    });
});
