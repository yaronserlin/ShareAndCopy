const busboy = require('busboy');
const mongoose = require('mongoose');
const File = require('../models/File');
const User = require('../models/User');
const logger = require('../utils/logger');
const { MAX_STORAGE_BYTES, FORBIDDEN_EXTENSIONS } = require('../utils/constants');

class FileService {
    constructor() { }

    async handleUpload(req, res, userId) {
        return new Promise((resolve, reject) => {
            const bb = busboy({ headers: req.headers, defParamCharset: 'utf8' });
            const gfsBucket = req.app.locals.gfsBucket;

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
                        checksum: 'PENDING',
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

    async getRoomFiles(roomId, requestUserId) {
        const roomOwner = await User.findOne({ roomId });
        if (!roomOwner) throw new Error('Room not found');

        const isOwner = requestUserId === roomOwner._id.toString();
        let query = { owner: roomOwner._id };

        if (!isOwner) {
            query.isPublic = true;
        }

        const files = await File.find(query).sort({ createdAt: -1 });

        return {
            files,
            isOwner,
            usedStorage: isOwner ? roomOwner.usedStorage : 0,
            ownerName: {
                firstName: roomOwner.firstName,
                lastName: roomOwner.lastName
            }
        };
    }

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
                // Option: Reject change
                throw new Error('File extension change is not allowed');

                // Option: Enforce original extension (commented out as user requested security checks)
                // const namePart = newName.substring(0, newName.lastIndexOf('.'));
                // file.filename = `${namePart}.${originalExt}`;
            } else {
                file.filename = newName;
            }
        }
        await file.save();
        return file;
    }
}

module.exports = new FileService();
