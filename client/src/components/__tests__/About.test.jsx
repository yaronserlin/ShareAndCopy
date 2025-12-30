import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import About from '../About/About';

describe('About Component', () => {
    test('renders about content', () => {
        render(
            <BrowserRouter>
                <About />
            </BrowserRouter>
        );
        expect(screen.getByText(/About Share & Copy/i)).toBeInTheDocument();
        expect(screen.getByText(/Secure & Private/i)).toBeInTheDocument();
        expect(screen.getByText(/Get Started/i)).toBeInTheDocument();
    });
});
