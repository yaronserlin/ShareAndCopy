const fileController = require('../src/controllers/fileController');
const fileService = require('../src/services/fileService');
const mongoose = require('mongoose');
const archiver = require('archiver');
const jwt = require('jsonwebtoken');

// Mock dependencies
jest.mock('../src/services/fileService');
jest.mock('archiver');
jest.mock('jsonwebtoken');
jest.mock('../src/utils/constants', () => ({
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
            },
            query: {}
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
        fileService.getZipStream.mockRejectedValue(new Error('No files to download'));
        await fileController.downloadAllFiles(req, res);
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ message: 'No files to download' });
    });

    it('should stream zip if files exist', async () => {
        fileService.getZipStream.mockResolvedValue({
            stream: mockArchive,
            filename: 'files.zip'
        });

        await fileController.downloadAllFiles(req, res);

        expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/zip');
        expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', expect.stringContaining('attachment; filename="files.zip"'));
        expect(mockArchive.pipe).toHaveBeenCalledWith(res);
    });

    it('should handle service errors', async () => {
        fileService.getZipStream.mockRejectedValue(new Error('Service failed'));
        await fileController.downloadAllFiles(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ message: 'Download all failed' });
    });
});
