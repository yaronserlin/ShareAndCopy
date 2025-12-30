import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Navbar from '../Navbar';
import { AuthProvider } from '../../context/AuthContext';

// Mock AuthContext
const mockLogout = vi.fn();
const mockAuth = {
    user: null,
    token: null,
    logout: mockLogout
};

vi.mock('../../context/AuthContext', () => ({
    useAuth: () => mockAuth,
    AuthProvider: ({ children }) => <div>{children}</div>
}));

describe('Navbar Component', () => {
    beforeEach(() => {
        mockLogout.mockClear();
        mockAuth.user = null;
        mockAuth.token = null;
    });

    test('renders logo and basic links', () => {
        render(
            <BrowserRouter>
                <Navbar />
            </BrowserRouter>
        );
        expect(screen.getByText(/Share & Copy/i)).toBeInTheDocument();
        expect(screen.getByText('Login')).toBeInTheDocument();
        expect(screen.getAllByText('Register').length).toBeGreaterThan(0);
    });

    test('renders logout button when logged in', () => {
        mockAuth.token = 'fake-token';
        mockAuth.user = { id: '123' };

        render(
            <BrowserRouter>
                <Navbar />
            </BrowserRouter>
        );
        expect(screen.getByText('Logout')).toBeInTheDocument();
        expect(screen.queryByText('Login')).not.toBeInTheDocument();
    });

    test('calls logout on click', () => {
        mockAuth.token = 'fake-token';
        mockAuth.user = { id: '123' };

        render(
            <BrowserRouter>
                <Navbar />
            </BrowserRouter>
        );

        fireEvent.click(screen.getByText('Logout'));
        expect(mockLogout).toHaveBeenCalled();
    });

    test('shows admin link for admin user', () => {
        mockAuth.token = 'fake-token';
        mockAuth.user = { id: '123', isAdmin: true };

        render(
            <BrowserRouter>
                <Navbar />
            </BrowserRouter>
        );

        expect(screen.getByText('Admin')).toBeInTheDocument();
    });
});
