/**
 * Preview: client/src/components/__tests__/Footer.test.jsx
 * Description: Test suite for ShareAndCopy functionality.
 */

import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Footer from '../Footer/Footer';
import { ThemeProvider } from '../../context/ThemeContext';


vi.mock('../../context/ThemeContext', () => ({
    useTheme: () => ({ theme: 'light', toggleTheme: vi.fn() }),
    ThemeProvider: ({ children }) => <div>{children}</div>
}));

describe('Footer Component', () => {
    test('renders footer content', () => {
        render(
            <BrowserRouter>
                <Footer />
            </BrowserRouter>
        );
        expect(screen.getByText(/Share & Copy/i)).toBeInTheDocument();
        expect(screen.getByText(new RegExp(new Date().getFullYear().toString()))).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /About/i })).toBeInTheDocument();
    });
});
