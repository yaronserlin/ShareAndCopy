const busboy = require('busboy');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const File = require('../models/File');
const User = require('../models/User');
const logger = require('../utils/logger');

const MAX_STORAGE = 1024 * 1024 * 1024 * 1024; // 1 GB

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
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const bb = busboy({ headers: req.headers, defParamCharset: 'utf8' });
    const gfsBucket = req.app.locals.gfsBucket;

    let uploadStream;
    let gridFsId;
    let fileMetrics = { size: 0, filename: '' };
    const fields = {};

    // Track file processing
    const fileUploads = [];

    bb.on('file', (name, file, info) => {
        const { filename, mimeType } = info;
        fileMetrics.filename = filename;
        logger.info(`Receiving file: ${filename}`);

        // File Type Validation
        // Block executable files for security
        const forbiddenExtensions = ['.exe', '.sh', '.bat', '.cmd', '.msi', '.bin', '.vbs', '.js', '.jar'];
        const ext = filename.slice(((filename.lastIndexOf(".") - 1) >>> 0) + 2).toLowerCase();

        if (forbiddenExtensions.includes(`.${ext}`)) {
            logger.warn(`Blocked restricted file type: ${filename}`);
            file.resume();
            return;
        }

        const uploadPromise = new Promise((resolve, reject) => {
            // Create write stream to GridFS
            uploadStream = gfsBucket.openUploadStream(filename, {
                contentType: 'application/octet-stream',
                metadata: {
                    owner: userId,
                    originalMimeType: mimeType
                }
            });

            gridFsId = uploadStream.id;

            file.pipe(uploadStream)
                .on('finish', () => {
                    // fileMetrics.size updated by gridfs usually, but we can verify
                    // In gridfs stream, we might need to check the actual stored file doc for size
                    // or count bytes.
                    resolve();
                })
                .on('error', reject);
        });

        fileUploads.push(uploadPromise);
    });

    bb.on('field', (name, val) => {
        fields[name] = val;
    });

    bb.on('close', async () => {
        try {
            await Promise.all(fileUploads);
        } catch (err) {
            logger.error(`File stream error: ${err}`);
            return res.status(500).json({ error: 'File upload stream failed' });
        }

        if (!gridFsId) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        try {
            // Wait a moment for GridFS to update file stats if needed, or query the chunks.
            // But we can get size from the file object in DB if we query it, or assume busboy calculation if we did one.
            // Let's query the file doc from fs.files to be sure of size.
            const stats = await mongoose.connection.db.collection('uploads.files').findOne({ _id: gridFsId });
            fileMetrics.size = stats ? stats.length : 0;

            const user = await User.findById(userId);
            if (!user) {
                await gfsBucket.delete(gridFsId);
                return res.status(404).json({ message: 'User not found' });
            }

            if (user.usedStorage + fileMetrics.size > MAX_STORAGE) {
                await gfsBucket.delete(gridFsId);
                logger.warn(`Storage limit exceeded for user ${userId}`);
                return res.status(400).json({ message: 'Storage limit exceeded (1GB)' });
            }

            const newFile = new File({
                filename: fileMetrics.filename,
                gridFsId: gridFsId,
                checksum: 'PENDING', // Client-side checksum not sent yet?
                size: fileMetrics.size,
                isPublic: fields.isPublic === 'true',
                owner: userId
            });

            await newFile.save();
            user.usedStorage += fileMetrics.size;
            await user.save();

            logger.info(`File uploaded: ${newFile._id} by ${userId} (${fileMetrics.size} bytes)`);
            res.status(201).json(newFile);

        } catch (err) {
            logger.error(`Upload error: ${err}`);
            if (gridFsId) try { await gfsBucket.delete(gridFsId); } catch (e) { }
            res.status(500).json({ error: err.message });
        }
    });

    req.pipe(bb);
};

exports.getRoomFiles = async (req, res) => {
    try {
        const roomOwner = await User.findOne({ roomId: req.params.roomId });
        if (!roomOwner) return res.status(404).json({ message: 'Room not found' });

        const requestUserId = getAuthUser(req);
        const isOwner = requestUserId === roomOwner._id.toString();

        let query = { owner: roomOwner._id };
        if (!isOwner) {
            query.isPublic = true;
        }

        const files = await File.find(query).sort({ createdAt: -1 });

        let usedStorage = 0;
        if (isOwner) {
            usedStorage = roomOwner.usedStorage;
        }

        res.json({
            files,
            isOwner,
            usedStorage,
            ownerName: {
                firstName: roomOwner.firstName,
                lastName: roomOwner.lastName
            }
        });
    } catch (err) {
        logger.error(`Get room files error: ${err}`);
        res.status(500).json({ error: err.message });
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
                return res.status(403).json({ message: 'Unauthorized' });
            }
        }

        const gfsBucket = req.app.locals.gfsBucket;
        if (!gfsBucket) {
            logger.error("GridFS bucket not initialized");
            return res.status(500).json({ message: "Internal Server Error: GFS not ready" });
        }

        try {
            // Check if file exists in GridFS first
            // Explicitly cast to ObjectId for robust querying
            const gridFsId = new mongoose.Types.ObjectId(file.gridFsId);
            const cursor = gfsBucket.find({ _id: gridFsId });
            const fileDocs = await cursor.toArray();

            if (!fileDocs || fileDocs.length === 0) {
                logger.warn(`GridFS file not found for ID: ${file.gridFsId}`);
                return res.status(404).json({ message: 'File content not found on server.' });
            }

            const downloadStream = gfsBucket.openDownloadStream(gridFsId);

            downloadStream.on('error', (err) => {
                logger.error(`GridFS Download Error: ${err}`);
                if (!res.headersSent) res.status(404).json({ message: 'File data not found during stream' });
            });

            // Send raw file to client
            // Use safer Content-Disposition with fallback for non-ASCII chars
            const filename = file.filename || "downloaded_file";

            // Create a safe ASCII-only version for the "filename" parameter
            // Replace any non-ASCII characters or quotes/slashes with underscores
            const safeAsciiFilename = filename.replace(/[^\x20-\x7E]|["\\]/g, '_');

            // RFC 5987 encode for "filename*" parameter (supports full UTF-8)
            const encodedFilename = encodeURIComponent(filename).replace(/['()]/g, escape).replace(/\*/g, '%2A');

            res.setHeader('Content-Disposition', `attachment; filename="${safeAsciiFilename}"; filename*=UTF-8''${encodedFilename}`);
            res.setHeader('Content-Type', 'application/octet-stream');

            downloadStream.pipe(res);
        } catch (streamErr) {
            logger.error(`Stream setup error: ${streamErr}`);
            if (!res.headersSent) res.status(500).json({ message: 'Stream setup failed' });
        }

    } catch (err) {
        logger.error(`Download failed: ${err.stack}`); // detailed stack trace
        if (!res.headersSent) res.status(500).json({ error: 'Download failed' });
    }
};

exports.renameFile = async (req, res) => {
    try {
        const file = await File.findById(req.params.id);
        if (!file) return res.status(404).json({ message: 'File not found' });

        const requestUserId = getAuthUser(req);
        if (!requestUserId || requestUserId !== file.owner.toString()) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        const { filename } = req.body;
        if (filename) file.filename = filename;

        await file.save();
        logger.info(`File renamed: ${file._id}`);
        res.json(file);
    } catch (err) {
        logger.error(`Rename error: ${err}`);
        res.status(500).json({ error: err.message });
    }
};

exports.deleteFile = async (req, res) => {
    try {
        const file = await File.findById(req.params.id);
        if (!file) return res.status(404).json({ message: 'File not found' });

        const requestUserId = getAuthUser(req);
        if (!requestUserId || requestUserId !== file.owner.toString()) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        const gfsBucket = req.app.locals.gfsBucket;

        try {
            await gfsBucket.delete(file.gridFsId);
        } catch (e) {
            logger.error(`Error deleting from GridFS: ${e}`);
        }

        const user = await User.findById(file.owner);
        if (user) {
            user.usedStorage = Math.max(0, user.usedStorage - file.size);
            await user.save();
        }

        await File.deleteOne({ _id: req.params.id });
        logger.info(`File deleted: ${req.params.id}`);
        res.json({ message: 'File deleted' });
    } catch (err) {
        logger.error(`Delete error: ${err}`);
        res.status(500).json({ error: err.message });
    }
};
