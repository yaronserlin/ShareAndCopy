import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Footer from '../Footer/Footer';
import { ThemeProvider } from '../../context/ThemeContext';

// Mock ThemeContext
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
        expect(screen.getByText(/2025/)).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /About/i })).toBeInTheDocument();
    });
});
