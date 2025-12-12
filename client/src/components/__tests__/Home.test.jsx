import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Home from '../Home';
import { AuthProvider } from '../../context/AuthContext';

// Mock AuthContext
vi.mock('../../context/AuthContext', () => ({
    useAuth: () => ({
        token: null,
        roomId: null
    }),
    AuthProvider: ({ children }) => <div>{children}</div>
}));

test('renders public home page correctly', () => {
    render(
        <BrowserRouter>
            <Home />
        </BrowserRouter>
    );
    expect(screen.getByText(/Share Files/i)).toBeInTheDocument();
    expect(screen.getByText(/Instantly & Securely/i)).toBeInTheDocument();
});
