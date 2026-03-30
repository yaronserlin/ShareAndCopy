/**
 * Preview: client/src/components/__tests__/NotFound.test.jsx
 * Description: Test suite for ShareAndCopy functionality.
 */

import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import NotFound from '../NotFound/NotFound';

describe('NotFound Component', () => {
    test('renders 404 message', () => {
        render(
            <BrowserRouter>
                <NotFound />
            </BrowserRouter>
        );
        expect(screen.getByText(/404/i)).toBeInTheDocument();
        expect(screen.getByText(/Page Not Found/i)).toBeInTheDocument();
    });
});
