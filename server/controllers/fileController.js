const jwt = require('jsonwebtoken');
const File = require('../models/File');
const logger = require('../utils/logger');
const fileService = require('../services/fileService');
const mongoose = require('mongoose');
const responseHandler = require('../utils/responseHandler');
const archiver = require('archiver');

// Helper to get auth user (optional)
const getAuthUser = (req) => {
    const token = req.header('x-auth-token');
    if (!token) return null;
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        return decoded.id;
    } catch (err) {
        return null;
    }
};

exports.uploadFile = async (req, res) => {
    const userId = getAuthUser(req);
    if (!userId) return responseHandler.error(res, 'Unauthorized', null, 401);

    try {
        const newFile = await fileService.handleUpload(req, res, userId);
        responseHandler.success(res, newFile, 'File uploaded successfully', 201);
    } catch (err) {
        logger.error(`Upload error: ${err.message}`);
        // Handle specific error messages
        if (err.message === 'Storage limit exceeded' || err.message === 'No file uploaded') {
            return responseHandler.error(res, err.message, null, 400);
        }
        responseHandler.error(res, 'Upload failed', err);
    }
};

exports.getRoomFiles = async (req, res) => {
    try {
        const requestUserId = getAuthUser(req);
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;

        const data = await fileService.getRoomFiles(req.params.roomId, requestUserId, page, limit);
        responseHandler.success(res, data, 'Files retrieved successfully');
    } catch (err) {
        logger.error(`Get room files error: ${err.message}`);
        if (err.message === 'Room not found') {
            return responseHandler.error(res, err.message, null, 404);
        }
        responseHandler.error(res, 'Failed to get room files', err);
    }
};

exports.generateDownloadToken = async (req, res) => {
    try {
        const file = await File.findById(req.params.fileId);
        if (!file) return responseHandler.error(res, 'File not found', null, 404);

        const requestUserId = getAuthUser(req);

        // Check permissions (same logic as download)
        if (!file.isPublic) {
            if (!requestUserId || requestUserId !== file.owner.toString()) {
                return responseHandler.error(res, 'Unauthorized', null, 403);
            }
        }

        // Generate short-lived token (1 minute) containing fileId and permissions
        const downloadToken = jwt.sign(
            { fileId: file._id, userId: requestUserId },
            process.env.JWT_SECRET,
            { expiresIn: '1m' }
        );

        responseHandler.success(res, { token: downloadToken }, 'Download token generated');
    } catch (err) {
        logger.error(`Token generation error: ${err.message}`);
        responseHandler.error(res, 'Failed to generate download token', err);
    }
};

exports.downloadFile = async (req, res) => {
    try {
        const fileId = req.params.fileId;
        const token = req.query.token;

        // Verify Token if present (Priority)
        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                if (decoded.fileId !== fileId) {
                    return res.status(403).json({ message: 'Invalid download token for this file' });
                }
                // Token is valid, proceed to download
            } catch (err) {
                return res.status(403).json({ message: 'Invalid or expired download token' });
            }
        } else {
            // Fallback to Header-based Auth (Legacy/Direct)
            const file = await File.findById(fileId);
            if (!file) return res.status(404).json({ message: 'File not found' });

            if (!file.isPublic) {
                const requestUserId = getAuthUser(req);
                if (!requestUserId || requestUserId !== file.owner.toString()) {
                    logger.warn(`Unauthorized download attempt for file ${file._id}`);
                    return responseHandler.error(res, 'Unauthorized', null, 403);
                }
            }
        }

        // Re-fetch file to ensure existence (if token used, we only verified claim, not file existence)
        const file = await File.findById(fileId);
        if (!file) return res.status(404).json({ message: 'File not found' });


        const gfsBucket = req.app.locals.gfsBucket;
        if (!gfsBucket) {
            return res.status(500).json({ message: "Internal Server Error: GFS not ready" });
        }

        try {
            const gridFsId = new mongoose.Types.ObjectId(file.gridFsId);
            // Check if file exists in GridFS before opening stream
            const filesCursor = gfsBucket.find({ _id: gridFsId });
            const files = await filesCursor.toArray();
            if (!files || files.length === 0) {
                return res.status(404).json({ message: 'File content not found on server.' });
            }

            const downloadStream = gfsBucket.openDownloadStream(gridFsId);

            downloadStream.on('error', (err) => {
                logger.error(`GridFS Download Error: ${err}`);
                if (!res.headersSent) res.status(404).json({ message: 'File data not found during stream' });
            });

            // Safe filename handling
            const filename = file.filename || "downloaded_file";
            const safeAsciiFilename = filename.replace(/[^\x20-\x7E]|["\\]/g, '_');
            const encodedFilename = encodeURIComponent(filename).replace(/['()]/g, escape).replace(/\*/g, '%2A');

            res.setHeader('Content-Disposition', `attachment; filename="${safeAsciiFilename}"; filename*=UTF-8''${encodedFilename}`);
            // Use mime-type if stored, otherwise octet-stream
            res.setHeader('Content-Type', 'application/octet-stream');

            downloadStream.pipe(res);
        } catch (streamErr) {
            logger.error(`Stream setup error: ${streamErr}`);
            if (!res.headersSent) res.status(500).json({ message: 'Stream setup failed' });
        }

    } catch (err) {
        logger.error(`Download failed: ${err.stack}`);
        if (!res.headersSent) res.status(500).json({ error: 'Download failed' });
    }
};

exports.generateDownloadAllToken = async (req, res) => {
    try {
        const { roomId } = req.params;
        const requestUserId = getAuthUser(req);

        // Basic permission check (can user access room?)
        // In this app, checking if files exist for the room/user tuple is complex here without duplicating logic.
        // Simplified: Token grants access to "download all files in room X as user Y".
        // The actual file fetching logic in `downloadAllFiles` will still filter by what the user is allowed to see.

        // Generate short-lived token (1 minute)
        const downloadToken = jwt.sign(
            { roomId, userId: requestUserId, type: 'zip-download' },
            process.env.JWT_SECRET,
            { expiresIn: '1m' }
        );

        responseHandler.success(res, { token: downloadToken }, 'Download token generated');
    } catch (err) {
        logger.error(`Token generation error: ${err.message}`);
        responseHandler.error(res, 'Failed to generate download token', err);
    }
};

exports.downloadAllFiles = async (req, res) => {
    try {
        const { roomId } = req.params;
        let requestUserId;

        if (req.query.token) {
            try {
                const decoded = jwt.verify(req.query.token, process.env.JWT_SECRET);
                if (decoded.roomId !== roomId || decoded.type !== 'zip-download') {
                    return res.status(403).json({ message: 'Invalid download token' });
                }
                requestUserId = decoded.userId;
            } catch (err) {
                return res.status(403).json({ message: 'Invalid or expired download token' });
            }
        } else {
            requestUserId = getAuthUser(req);
        }

        const files = await fileService.getAllRoomFiles(roomId, requestUserId);

        if (!files || files.length === 0) {
            return res.status(404).json({ message: 'No files to download' });
        }

        const gfsBucket = req.app.locals.gfsBucket;
        if (!gfsBucket) {
            return res.status(500).json({ message: "Internal Server Error: GFS not ready" });
        }

        const archive = archiver('zip', {
            zlib: { level: 9 } // Sets the compression level.
        });

        const User = require('../models/User'); // Ensure User model is required if not globally available, but likely already required at top.
        // Actually User is already required at line 4 (based on previous view_file of services/fileService, wait, fileController requires models/File, utils..., fileService... let's check top of fileController)
        // fileController imports: jwt, File, logger, fileService, mongoose, responseHandler, archiver.
        // It does NOT import User. I need to add it or use fileService to get the name?
        // fileService.getRoomFiles gets the name. 
        // But here we are in downloadAllFiles. 
        // I should probably require User at the top or just use it here if I add the require.
        // Let's add `const User = require('../models/User');` at the top or use fileService helper if available? 
        // fileService.getAllRoomFiles returns files. 

        // Let's look up the user by roomId directly here.
        const roomOwner = await require('../models/User').findOne({ roomId });
        const ownerName = roomOwner ? `${roomOwner.firstName} ${roomOwner.lastName}` : 'room';
        const safeOwnerName = ownerName.replace(/[^a-zA-Z0-9-_ ]/g, '').trim();

        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${safeOwnerName}'s files.zip"`);

        archive.pipe(res);

        // Handle archive errors
        archive.on('error', (err) => {
            logger.error(`Archive error: ${err.message}`);
            if (!res.headersSent) res.status(500).end();
        });

        // Iterate and append files
        for (const file of files) {
            const gridFsId = new mongoose.Types.ObjectId(file.gridFsId);

            // Check if file exists in GridFS before appending
            const cursor = gfsBucket.find({ _id: gridFsId });
            const hasFile = await cursor.hasNext(); // Use hasNext for efficiency

            if (hasFile) {
                const downloadStream = gfsBucket.openDownloadStream(gridFsId);

                // Safe filename
                const safeFilename = file.filename.replace(/[/\\?%*:|"<>]/g, '_');

                archive.append(downloadStream, { name: safeFilename });
            } else {
                logger.warn(`File metadata exists but GridFS file missing: ${file._id}`);
            }
        }

        await archive.finalize();

    } catch (err) {
        logger.error(`Download all error: ${err.message}`);
        if (!res.headersSent) {
            if (err.message === 'Room not found') {
                return responseHandler.error(res, err.message, null, 404);
            }
            responseHandler.error(res, 'Failed to download all files', err);
        }
    }
};


exports.renameFile = async (req, res) => {
    try {
        const requestUserId = getAuthUser(req);
        if (!requestUserId) return responseHandler.error(res, 'Unauthorized', null, 401);

        const updatedFile = await fileService.renameFile(req.params.id, req.body.filename, requestUserId);
        responseHandler.success(res, updatedFile, 'File renamed successfully');
    } catch (err) {
        logger.error(`Rename error: ${err.message}`);
        if (err.message === 'Unauthorized') return responseHandler.error(res, err.message, null, 403);
        if (err.message === 'File not found') return responseHandler.error(res, err.message, null, 404);
        if (err.message === 'File extension change is not allowed') return responseHandler.error(res, err.message, null, 400);
        responseHandler.error(res, 'Rename failed', err);
    }
};

exports.deleteFile = async (req, res) => {
    try {
        const requestUserId = getAuthUser(req);
        if (!requestUserId) return responseHandler.error(res, 'Unauthorized', null, 401);

        const gfsBucket = req.app.locals.gfsBucket;
        const result = await fileService.deleteFile(req.params.id, requestUserId, gfsBucket);
        responseHandler.success(res, result, 'File deleted successfully');
    } catch (err) {
        logger.error(`Delete error: ${err.message}`);
        if (err.message === 'Unauthorized') return responseHandler.error(res, err.message, null, 403);
        if (err.message === 'File not found') return responseHandler.error(res, err.message, null, 404);
        responseHandler.error(res, 'Delete failed', err);
    }
};

