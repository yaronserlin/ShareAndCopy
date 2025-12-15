const fileController = require('../controllers/fileController');
const fileService = require('../services/fileService');
const mongoose = require('mongoose');
const archiver = require('archiver');
const jwt = require('jsonwebtoken');

// Mock dependencies
jest.mock('../services/fileService');
jest.mock('archiver');
jest.mock('jsonwebtoken');
jest.mock('../utils/constants', () => ({
    MAX_STORAGE_BYTES: 1024 * 1024 * 1024,
    FORBIDDEN_EXTENSIONS: []
}));

describe('FileController - downloadAllFiles', () => {
    let req, res, mockGfs, mockArchive;

    beforeEach(() => {
        mockGfs = {
            find: jest.fn(),
            openDownloadStream: jest.fn()
        };

        req = {
            params: { roomId: 'room123' },
            header: jest.fn().mockReturnValue('valid-token'),
            app: {
                locals: {
                    gfsBucket: mockGfs
                }
            }
        };

        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            setHeader: jest.fn(),
            headersSent: false,
            end: jest.fn()
        };

        mockArchive = {
            pipe: jest.fn(),
            on: jest.fn(),
            append: jest.fn(),
            finalize: jest.fn().mockResolvedValue()
        };

        archiver.mockReturnValue(mockArchive);
        jwt.verify.mockReturnValue({ id: 'user123' });
        jest.clearAllMocks();
    });

    it('should return 404 if no files found', async () => {
        fileService.getAllRoomFiles.mockResolvedValue([]);
        await fileController.downloadAllFiles(req, res);
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ message: 'No files to download' });
    });

    it('should stream zip if files exist', async () => {
        const mockFiles = [
            { _id: 'f1', filename: 'test.txt', gridFsId: new mongoose.Types.ObjectId() },
            { _id: 'f2', filename: 'image.png', gridFsId: new mongoose.Types.ObjectId() }
        ];
        fileService.getAllRoomFiles.mockResolvedValue(mockFiles);

        // Mock GFS finding files
        const mockCursor = {
            hasNext: jest.fn().mockResolvedValue(true)
        };
        mockGfs.find.mockReturnValue(mockCursor);
        mockGfs.openDownloadStream.mockReturnValue('stream-data');

        await fileController.downloadAllFiles(req, res);

        expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/zip');
        expect(mockArchive.pipe).toHaveBeenCalledWith(res);
        expect(mockArchive.append).toHaveBeenCalledTimes(2);
        expect(mockArchive.finalize).toHaveBeenCalled();
    });

    it('should handle archive errors', async () => {
        const mockFiles = [{ _id: 'f1', filename: 'test.txt', gridFsId: new mongoose.Types.ObjectId() }];
        fileService.getAllRoomFiles.mockResolvedValue(mockFiles);
        mockGfs.find.mockReturnValue({ hasNext: jest.fn().mockResolvedValue(true) });

        await fileController.downloadAllFiles(req, res);

        // Trigger error handler
        const errorCallback = mockArchive.on.mock.calls.find(call => call[0] === 'error')[1];
        errorCallback(new Error('Archive failed'));

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.end).toHaveBeenCalled();
    });
});
