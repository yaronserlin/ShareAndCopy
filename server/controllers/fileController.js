const jwt = require('jsonwebtoken');
const File = require('../models/File');
const logger = require('../utils/logger');
const fileService = require('../services/fileService');
const mongoose = require('mongoose');
const responseHandler = require('../utils/responseHandler');

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

exports.downloadFile = async (req, res) => {
    try {
        const file = await File.findById(req.params.fileId);
        if (!file) return res.status(404).json({ message: 'File not found' });

        if (!file.isPublic) {
            const requestUserId = getAuthUser(req);
            if (!requestUserId || requestUserId !== file.owner.toString()) {
                logger.warn(`Unauthorized download attempt for file ${file._id}`);
                return responseHandler.error(res, 'Unauthorized', null, 403);
            }
        }

        const gfsBucket = req.app.locals.gfsBucket;
        if (!gfsBucket) {
            return res.status(500).json({ message: "Internal Server Error: GFS not ready" });
        }

        try {
            const gridFsId = new mongoose.Types.ObjectId(file.gridFsId);
            const cursor = gfsBucket.find({ _id: gridFsId });
            const fileDocs = await cursor.toArray();

            if (!fileDocs || fileDocs.length === 0) {
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

