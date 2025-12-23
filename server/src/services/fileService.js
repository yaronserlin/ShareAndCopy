const busboy = require('busboy');
const mongoose = require('mongoose');
const archiver = require('archiver');
const jwt = require('jsonwebtoken'); // Added for token generation
const File = require('../models/File');
const User = require('../models/User');
const env = require('../config/env');
const logger = require('../utils/logger');
const { MAX_STORAGE_BYTES, FORBIDDEN_EXTENSIONS } = require('../utils/constants');

/**
 * Service for handling File operations
 */
class FileService {
    constructor() { }

    /**
     * Handle file upload
     * @param {Object} req - Request object
     * @param {string} userId - User ID
     * @param {Object} gfsBucket - GridFSBucket instance
     * @returns {Promise<Object>} Created file object
     */
    async handleUpload(req, userId, gfsBucket) {
        return new Promise((resolve, reject) => {
            const bb = busboy({ headers: req.headers, defParamCharset: 'utf8' });

            let uploadStream;
            let gridFsId;
            let fileMetrics = { size: 0, filename: '' };
            const fields = {};
            const fileUploads = [];

            // Busboy Events
            bb.on('file', (name, file, info) => {
                const { filename, mimeType } = info;
                fileMetrics.filename = filename;
                logger.info(`Receiving file: ${filename}`);

                // Validation
                const ext = filename.slice(((filename.lastIndexOf(".") - 1) >>> 0) + 2).toLowerCase();
                if (FORBIDDEN_EXTENSIONS.includes(`.${ext}`)) {
                    logger.warn(`Blocked restricted file type: ${filename}`);
                    file.resume();
                    return; // Skip this file
                }

                const uploadPromise = new Promise((resolveStream, rejectStream) => {
                    uploadStream = gfsBucket.openUploadStream(filename, {
                        contentType: 'application/octet-stream',
                        metadata: {
                            owner: userId,
                            originalMimeType: mimeType
                        }
                    });

                    gridFsId = uploadStream.id;

                    file.pipe(uploadStream)
                        .on('finish', resolveStream)
                        .on('error', rejectStream);
                });

                fileUploads.push(uploadPromise);
            });

            bb.on('field', (name, val) => {
                fields[name] = val;
            });

            bb.on('close', async () => {
                try {
                    await Promise.all(fileUploads);

                    if (!gridFsId) {
                        return reject(new Error('No file uploaded'));
                    }

                    // Verify storage limit
                    const stats = await mongoose.connection.db.collection('uploads.files').findOne({ _id: gridFsId });
                    fileMetrics.size = stats ? stats.length : 0;

                    const user = await User.findById(userId);
                    if (!user) {
                        await gfsBucket.delete(gridFsId);
                        return reject(new Error('User not found'));
                    }

                    if (user.usedStorage + fileMetrics.size > MAX_STORAGE_BYTES) {
                        await gfsBucket.delete(gridFsId);
                        return reject(new Error('Storage limit exceeded'));
                    }

                    // Save Metadata
                    const newFile = new File({
                        filename: fileMetrics.filename,
                        gridFsId: gridFsId,
                        checksum: 'PENDING', // Could be implemented with crypto stream
                        size: fileMetrics.size,
                        isPublic: fields.isPublic === 'true',
                        owner: userId
                    });

                    await newFile.save();
                    user.usedStorage += fileMetrics.size;
                    await user.save();

                    logger.info(`File uploaded: ${newFile._id} by ${userId}`);
                    resolve(newFile);

                } catch (err) {
                    if (gridFsId) {
                        try { await gfsBucket.delete(gridFsId); } catch (e) { }
                    }
                    reject(err);
                }
            });

            bb.on('error', (err) => reject(err));

            req.pipe(bb);
        });
    }

    /**
     * Get file download stream
     * @param {string} fileId - File ID
     * @param {string} userId - Requesting User ID (nullable)
     * @param {Object} gfsBucket - GridFSBucket instance
     * @param {string} token - Download token (optional)
     * @returns {Promise<Object>} { stream, filename, mimeType }
     */
    async getDownloadStream(fileId, userId, gfsBucket, token = null) {
        const file = await File.findById(fileId);
        if (!file) throw new Error('File not found');

        let authorized = false;

        if (token) {
            // Token verified in controller/middleware, mostly for correct file association
            authorized = true;
        } else {
            if (file.isPublic) {
                authorized = true;
            } else if (userId && file.owner.toString() === userId) {
                authorized = true;
            }
        }

        if (!authorized) throw new Error('Unauthorized');

        const gridFsId = new mongoose.Types.ObjectId(file.gridFsId);
        const filesCursor = gfsBucket.find({ _id: gridFsId });
        const files = await filesCursor.toArray();
        if (!files || files.length === 0) {
            throw new Error('File content not found on server');
        }

        const stream = gfsBucket.openDownloadStream(gridFsId);
        return { stream, filename: file.filename };
    }

    /**
     * Get files for a room with pagination
     * @param {string} roomId 
     * @param {string} requestUserId 
     * @param {number} page 
     * @param {number} limit 
     * @returns {Promise<Object>}
     */
    async getRoomFiles(roomId, requestUserId, page = 1, limit = 20) {
        const roomOwner = await User.findOne({ roomId });
        if (!roomOwner) throw new Error('Room not found');

        const isOwner = requestUserId === roomOwner._id.toString();
        let query = { owner: roomOwner._id };

        if (!isOwner) {
            query.isPublic = true;
        }

        const skip = (page - 1) * limit;

        const [files, total] = await Promise.all([
            File.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            File.countDocuments(query)
        ]);

        return {
            files,
            total,
            page,
            totalPages: Math.ceil(total / limit),
            isOwner,
            usedStorage: isOwner ? roomOwner.usedStorage : 0,
            ownerName: {
                firstName: roomOwner.firstName,
                lastName: roomOwner.lastName
            }
        };
    }

    /**
     * Get all files in a room (internal helper)
     * @param {string} roomId 
     * @param {string} requestUserId 
     * @returns {Promise<Array>}
     */
    async getAllRoomFiles(roomId, requestUserId) {
        const roomOwner = await User.findOne({ roomId });
        if (!roomOwner) throw new Error('Room not found');

        const isOwner = requestUserId === roomOwner._id.toString();
        let query = { owner: roomOwner._id };

        if (!isOwner) {
            query.isPublic = true;
        }

        return File.find(query).sort({ createdAt: -1 });
    }

    /**
     * Generate a download token for a single file
     * @param {string} fileId 
     * @param {string} userId 
     * @returns {Promise<string>} JWT Token
     */
    async generateDownloadToken(fileId, userId) {
        const file = await File.findById(fileId);
        if (!file) throw new Error('File not found');

        if (!file.isPublic) {
            if (!userId || userId !== file.owner.toString()) {
                throw new Error('Unauthorized');
            }
        }

        return jwt.sign(
            { fileId: file._id, userId },
            env.JWT_SECRET,
            { expiresIn: '1m' }
        );
    }

    /**
     * Generate a download token for ALL files in a room
     * @param {string} roomId 
     * @param {string} userId 
     * @returns {Promise<string>} JWT Token
     */
    async generateDownloadAllToken(roomId, userId) {
        // Token grants permission to download room's files
        // We might want to verify room exists here too, but simple signing is okay
        // Logic check: does user have permission?
        // Ideally we check if room exists
        const roomOwner = await User.findOne({ roomId });
        if (!roomOwner) throw new Error('Room not found');

        // If room is public (implicit? no room concept of public, only files)
        // Actually, anyone can download public files.
        // But for ZIP, we are downloading what the user can see.
        // We will sign the token with userId. 
        // Logic later checks if files are accessible to this userId.

        return jwt.sign(
            { roomId, userId, type: 'zip-download' },
            env.JWT_SECRET,
            { expiresIn: '1m' }
        );
    }

    /**
     * Get zip stream for all files in a room
     * @param {string} roomId 
     * @param {string} requestUserId 
     * @param {Object} gfsBucket 
     * @returns {Promise<Object>} { archive, filename }
     */
    async getZipStream(roomId, requestUserId, gfsBucket) {
        const roomOwner = await User.findOne({ roomId });
        if (!roomOwner) throw new Error('Room not found');

        // Note: Logic to check if user authorized to download files is same as getAllRoomFiles
        const files = await this.getAllRoomFiles(roomId, requestUserId);

        if (!files || files.length === 0) {
            throw new Error('No files to download');
        }

        const archive = archiver('zip', {
            zlib: { level: 9 }
        });

        const ownerName = `${roomOwner.firstName} ${roomOwner.lastName}`;
        const safeOwnerName = ownerName.replace(/[^a-zA-Z0-9-_ ]/g, '').trim();
        const zipFilename = `${safeOwnerName}'s files.zip`;

        this._fillArchive(archive, files, gfsBucket).catch(err => {
            logger.error(`Error filling archive: ${err}`);
            archive.emit('error', err); // Propagate error to archive stream
        });

        return { stream: archive, filename: zipFilename };
    }

    /**
     * Internal helper to fill archive
     * @private
     */
    async _fillArchive(archive, files, gfsBucket) {
        for (const file of files) {
            const gridFsId = new mongoose.Types.ObjectId(file.gridFsId);
            const cursor = gfsBucket.find({ _id: gridFsId });
            const hasFile = await cursor.hasNext();

            if (hasFile) {
                const downloadStream = gfsBucket.openDownloadStream(gridFsId);
                const safeFilename = file.filename.replace(/[/\\?%*:|"<>]/g, '_');
                archive.append(downloadStream, { name: safeFilename });
            }
        }
        await archive.finalize();
    }

    /**
     * Delete a file
     * @param {string} fileId 
     * @param {string} requestUserId 
     * @param {Object} gfsBucket 
     * @returns {Promise<Object>}
     */
    async deleteFile(fileId, requestUserId, gfsBucket) {
        const file = await File.findById(fileId);
        if (!file) throw new Error('File not found');

        if (requestUserId !== file.owner.toString()) {
            throw new Error('Unauthorized');
        }

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

        await File.deleteOne({ _id: fileId });
        return { message: 'File deleted' };
    }

    /**
     * Rename a file
     * @param {string} fileId 
     * @param {string} newName 
     * @param {string} requestUserId 
     * @returns {Promise<Object>} Updated file
     */
    async renameFile(fileId, newName, requestUserId) {
        const file = await File.findById(fileId);
        if (!file) throw new Error('File not found');

        if (requestUserId !== file.owner.toString()) {
            throw new Error('Unauthorized');
        }

        if (newName) {
            const originalExt = file.filename.slice(((file.filename.lastIndexOf(".") - 1) >>> 0) + 2).toLowerCase();
            const newExt = newName.slice(((newName.lastIndexOf(".") - 1) >>> 0) + 2).toLowerCase();

            if (originalExt !== newExt) {
                throw new Error('File extension change is not allowed');
            } else {
                file.filename = newName;
            }
        }
        await file.save();
        return file;
    }
}

module.exports = new FileService();
