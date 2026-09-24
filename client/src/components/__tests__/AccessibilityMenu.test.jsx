/**
 * Preview: client/src/components/__tests__/AccessibilityMenu.test.jsx
 * Description: Accessibility menu preferences and placement.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import AccessibilityMenu, { computeBottomOffset } from '../AccessibilityMenu/AccessibilityMenu';

describe('computeBottomOffset', () => {
    test('uses the base gap when nothing is on screen', () => {
        expect(computeBottomOffset([], 800)).toBe(16);
        expect(computeBottomOffset([{ top: 900, bottom: 960 }], 800)).toBe(16);
    });

    test('lifts the button above a visible footer', () => {
        expect(computeBottomOffset([{ top: 750, bottom: 800 }], 800)).toBe(66);
    });

    test('clears the tallest of several obstacles', () => {
        const rects = [{ top: 750, bottom: 800 }, { top: 680, bottom: 800 }];
        expect(computeBottomOffset(rects, 800)).toBe(136);
    });
});

describe('AccessibilityMenu', () => {
    beforeEach(() => {
        localStorage.clear();
        document.documentElement.className = '';
        document.documentElement.style.fontSize = '';
    });

    test('opens and applies preferences', () => {
        render(<AccessibilityMenu />);
        fireEvent.click(screen.getByRole('button', { name: /open accessibility menu/i }));
        expect(screen.getByRole('dialog', { name: /accessibility options/i })).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /increase text size/i }));
        expect(document.documentElement.style.fontSize).toBe('110%');

        fireEvent.click(screen.getByLabelText(/high contrast/i));
        expect(document.documentElement.classList.contains('a11y-high-contrast')).toBe(true);

        fireEvent.click(screen.getByLabelText(/underline links/i));
        expect(JSON.parse(localStorage.getItem('accessibility-preferences'))).toMatchObject({
            fontStep: 1, highContrast: true, underlineLinks: true,
        });

        fireEvent.click(screen.getByRole('button', { name: /reset/i }));
        expect(document.documentElement.style.fontSize).toBe('100%');
        expect(document.documentElement.classList.contains('a11y-high-contrast')).toBe(false);
    });
});
