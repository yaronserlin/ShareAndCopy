/**
 * Preview: client/src/components/__tests__/Navbar.test.jsx
 * Description: Test suite for ShareAndCopy functionality.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Navbar from '../Navbar';
import { AuthProvider } from '../../context/AuthContext';


const mockLogout = vi.fn();
const mockAuth = {
    user: null,
    isAuthenticated: false,
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
        mockAuth.isAuthenticated = false;
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
        mockAuth.isAuthenticated = true;
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
        mockAuth.isAuthenticated = true;
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
        mockAuth.isAuthenticated = true;
        mockAuth.user = { id: '123', isAdmin: true };

        render(
            <BrowserRouter>
                <Navbar />
            </BrowserRouter>
        );

        expect(screen.getByText('Admin')).toBeInTheDocument();
    });
});
