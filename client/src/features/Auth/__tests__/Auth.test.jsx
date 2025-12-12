import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Auth from '../index';
import { AuthProvider } from '../../../context/AuthContext';

// Mock mocks
vi.mock('../../../context/AuthContext', () => ({
    useAuth: () => ({
        login: vi.fn()
    }),
    AuthProvider: ({ children }) => <div>{children}</div>
}));

test('renders login form by default', () => {
    render(
        <BrowserRouter>
            <Auth />
        </BrowserRouter>
    );
    expect(screen.getByPlaceholderText(/Enter your email/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Login/i })).toBeInTheDocument();
});

test('toggles to register', () => {
    render(
        <BrowserRouter>
            <Auth />
        </BrowserRouter>
    );
    const toggleButton = screen.getByText(/Don't have an account\? Sign up/i);
    fireEvent.click(toggleButton);
    expect(screen.getByText(/Already have an account\? Log in/i)).toBeInTheDocument();
});
