import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import RoomView from '../index';
import api from '../../../utils/api';

// Mock api
vi.mock('../../../utils/api', () => ({
    default: {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
        interceptors: {
            request: { use: vi.fn(), eject: vi.fn() },
            response: { use: vi.fn(), eject: vi.fn() }
        }
    }
}));

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
    default: {
        success: vi.fn(),
        error: vi.fn()
    }
}));

// Mock react-qr-code
vi.mock('react-qr-code', () => ({
    default: () => <div data-testid="qr-code">QR Code</div>
}));

vi.mock('../../../context/UploadContext', () => ({
    useUpload: () => ({
        isUploading: false,
        uploadProgress: 0,
        uploadSpeed: 0,
        uploadETA: 0,
        startUpload: vi.fn(),
        activeRoomId: 'test-room',
        lastUploadedFile: null
    })
}));

const renderWithRouter = (ui, { route = '/room/123' } = {}) => {
    window.history.pushState({}, 'Test page', route);
    return render(
        <BrowserRouter>
            {ui}
        </BrowserRouter>
    );
};

test('renders loading skeleton initially', () => {
    // Mock pending response
    api.get.mockImplementation(() => new Promise(() => { }));

    renderWithRouter(<RoomView />);
    // Check for skeleton placeholder class or structure
    // Since skeleton doesn't have text, checking for container
    const skeletons = document.getElementsByClassName('skeleton-loader'); // Updated to match Skeleton component
    expect(skeletons.length).toBeGreaterThan(0);
});

test('renders room details after fetch', async () => {
    const mockFiles = [
        { _id: '1', filename: 'test.txt', size: 1024, createdAt: new Date().toISOString(), isPublic: true }
    ];

    api.get.mockResolvedValue({
        data: {
            success: true,
            data: {
                files: mockFiles,
                isOwner: true,
                usedStorage: 1024,
                ownerName: { firstName: 'John', lastName: 'Doe' }
            }
        }
    });

    renderWithRouter(<RoomView />);

    await waitFor(() => {
        expect(screen.getByText('test.txt')).toBeInTheDocument();
    });
    // With new header changes, look for Owner Name
    expect(screen.getByText(/John Doe's Room/i)).toBeInTheDocument();
});
