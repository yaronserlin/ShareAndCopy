const fileService = require('../services/fileService');
const logger = require('../utils/logger');
const responseHandler = require('../utils/responseHandler');
const jwt = require('jsonwebtoken');
const env = require('../config/env');

/**
 * Controller for File operations
 * @module controllers/fileController
 */

/**
 * Upload a file
 * @async
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @route POST /api/files/upload
 */
exports.uploadFile = async (req, res) => {
    logger.debug('Upload file request received');
    // Auth middleware ensures req.user exists
    const userId = req.user.id;
    const gfsBucket = req.app.locals.gfsBucket;

    try {
        const newFile = await fileService.handleUpload(req, userId, gfsBucket);
        logger.info(`File uploaded successfully: ${newFile.filename} (ID: ${newFile._id}) by user ${userId}`);
        responseHandler.success(res, newFile, 'File uploaded successfully', 201);
    } catch (err) {
        logger.error(`Upload error: ${err.message}`);
        if (err.message === 'Storage limit exceeded' || err.message === 'No file uploaded' || err.message === 'User not found') {
            logger.warn(`Upload rejected: ${err.message} for user ${userId}`);
            return responseHandler.error(res, err.message, null, 400);
        }
        if (err.message && (err.message.includes('Blocked restricted file type') || err.message.includes('Missing Content-Type'))) {
            return responseHandler.error(res, err.message, null, 400);
        }
        responseHandler.error(res, 'Upload failed', err);
    }
};

/**
 * Get files for a specific room
 * @async
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @route GET /api/files/room/:roomId
 */
exports.getRoomFiles = async (req, res) => {
    logger.debug(`Get room files request for room: ${req.params.roomId}`);
    try {
        // req.user might be present if auth/optional middleware ran
        const userId = req.user ? req.user.id : null;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;

        const data = await fileService.getRoomFiles(req.params.roomId, userId, page, limit);
        logger.info(`Retrieved ${data.files.length} files for room ${req.params.roomId}`);
        responseHandler.success(res, data, 'Files retrieved successfully');
    } catch (err) {
        if (err.message === 'Room not found') {
            return responseHandler.error(res, err.message, null, 404);
        }
        logger.error(`Get room files error: ${err.message}`);
        responseHandler.error(res, 'Failed to get room files', err);
    }
};

/**
 * Generate download token
 * @async
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @route GET /api/files/download/:fileId/token
 */
exports.generateDownloadToken = async (req, res) => {
    logger.debug(`Generate download token request for file: ${req.params.fileId}`);
    try {
        const userId = req.user ? req.user.id : null;
        const downloadToken = await fileService.generateDownloadToken(req.params.fileId, userId);
        responseHandler.success(res, { token: downloadToken }, 'Download token generated');
    } catch (err) {
        logger.error(`Token generation error: ${err.message}`);
        if (err.message === 'File not found') return responseHandler.error(res, 'File not found', null, 404);
        if (err.message === 'Unauthorized') return responseHandler.error(res, 'Unauthorized', null, 403);
        responseHandler.error(res, 'Failed to generate download token', err);
    }
};

/**
 * Download a file
 * @async
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @route GET /api/files/download/:fileId
 */
exports.downloadFile = async (req, res) => {
    const fileId = req.params.fileId;
    const token = req.query.token;

    let userId = null;
    let validToken = false;

    if (token) {
        try {
            const decoded = jwt.verify(token, env.JWT_SECRET);
            if (decoded.fileId === fileId) {
                validToken = true;
                userId = decoded.userId;
            }
        } catch (e) { }
    } else {
        userId = req.user ? req.user.id : null;
    }

    try {
        const gfsBucket = req.app.locals.gfsBucket;
        if (!gfsBucket) {
            logger.error('GridFSBucket is not initialized');
            return res.status(500).json({ message: 'Internal Server Error' });
        }

        const { stream, filename } = await fileService.getDownloadStream(fileId, userId, gfsBucket, validToken ? token : null);

        const safeFilename = filename.replace(/[^\x20-\x7E]|["\\]/g, '_');
        const encodedFilename = encodeURIComponent(filename).replace(/['()]/g, escape).replace(/\*/g, '%2A');

        res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"; filename*=UTF-8''${encodedFilename}`);
        res.setHeader('Content-Type', 'application/octet-stream');

        stream.pipe(res);

        stream.on('error', (err) => {
            logger.error(`Stream error: ${err}`);
            if (!res.headersSent) res.status(404).json({ message: 'File not found in storage' });
        });

    } catch (err) {
        if (err.message === 'Unauthorized') return res.status(403).json({ message: 'Unauthorized' });
        if (err.message === 'File not found') return res.status(404).json({ message: 'File not found' });
        logger.error(`Download failed: ${err.message}`);
        if (!res.headersSent) res.status(500).json({ message: 'Download failed' });
    }
};

/**
 * Generate download token for ALL files
 * @async
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @route GET /api/files/room/:roomId/download-all/token
 */
exports.generateDownloadAllToken = async (req, res) => {
    try {
        const { roomId } = req.params;
        const userId = req.user ? req.user.id : null;

        const downloadToken = await fileService.generateDownloadAllToken(roomId, userId);
        responseHandler.success(res, { token: downloadToken }, 'Download token generated');
    } catch (err) {
        if (err.message === 'Room not found') return responseHandler.error(res, 'Room not found', null, 404);
        responseHandler.error(res, 'Failed to generate token', err);
    }
};

/**
 * Download ALL files as ZIP
 * @async
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @route GET /api/files/room/:roomId/download-all
 */
exports.downloadAllFiles = async (req, res) => {
    const { roomId } = req.params;
    const token = req.query.token;
    let userId = null;

    if (token) {
        try {
            const decoded = jwt.verify(token, env.JWT_SECRET);
            if (decoded.roomId === roomId && decoded.type === 'zip-download') {
                userId = decoded.userId;
            } else {
                return res.status(403).json({ message: 'Invalid token' });
            }
        } catch (e) {
            return res.status(403).json({ message: 'Invalid token' });
        }
    } else {
        userId = req.user ? req.user.id : null;
    }

    try {
        const gfsBucket = req.app.locals.gfsBucket;
        const { stream, filename } = await fileService.getZipStream(roomId, userId, gfsBucket);

        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        stream.pipe(res);

        stream.on('error', (err) => {
            logger.error(`Archive stream error: ${err}`);
        });

    } catch (err) {
        logger.error(`Download all error: ${err.message}`);
        if (err.message === 'No files to download' || err.message === 'Room not found') {
            return res.status(404).json({ message: err.message });
        }
        if (!res.headersSent) res.status(500).json({ message: 'Download all failed' });
    }
};

/**
 * Rename a file
 * @async
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @route PUT /api/files/:id/rename
 */
exports.renameFile = async (req, res) => {
    try {
        // req.user guaranteed by auth middleware
        const result = await fileService.renameFile(req.params.id, req.body.filename, req.user.id);
        logger.info(`File renamed: ${result._id}`);
        responseHandler.success(res, result, 'File renamed successfully');
    } catch (err) {
        if (err.message === 'Unauthorized') return responseHandler.error(res, err.message, null, 403);
        if (err.message === 'File not found') return responseHandler.error(res, err.message, null, 404);
        if (err.message === 'File extension change is not allowed') return responseHandler.error(res, err.message, null, 400);
        responseHandler.error(res, 'Rename failed', err);
    }
};

/**
 * Delete a file
 * @async
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @route DELETE /api/files/:id
 */
exports.deleteFile = async (req, res) => {
    try {
        const gfsBucket = req.app.locals.gfsBucket;
        const result = await fileService.deleteFile(req.params.id, req.user.id, gfsBucket);
        logger.info(`File deleted: ${req.params.id}`);
        responseHandler.success(res, result, 'File deleted successfully');
    } catch (err) {
        if (err.message === 'Unauthorized') return responseHandler.error(res, err.message, null, 403);
        if (err.message === 'File not found') return responseHandler.error(res, err.message, null, 404);
        responseHandler.error(res, 'Delete failed', err);
    }
};
