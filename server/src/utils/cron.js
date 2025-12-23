const cron = require('node-cron');
const mongoose = require('mongoose');
const File = require('../models/File');
const logger = require('./logger');

/**
 * Starts the application cron jobs.
 * 
 * Scheduled jobs:
 * 1. Auto-deletion of files older than 24 hours (runs hourly).
 */
const runAutoDelete = async () => {
    logger.info('Running auto-delete cron job...');

    // Calculate the cutoff time (24 hours ago)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    try {
        // Find files older than 24 hours
        // Optimization: Only select necessary fields (_id, gridFsId, filename, size, owner)
        const filesToDelete = await File.find({
            createdAt: { $lt: twentyFourHoursAgo }
        }).select('_id gridFsId filename size owner');

        if (filesToDelete.length === 0) {
            logger.info('No files to delete.');
            return;
        }

        // Ensure mongoose is connected before attempting GridFS operations
        if (mongoose.connection.readyState !== 1) {
            logger.warn('Mongoose not connected, skipping cron execution.');
            return;
        }

        // Create a GridFS bucket instance for file operations
        const gfsBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
            bucketName: 'uploads'
        });

        // Process deletions in parallel with Promise.allSettled to ensure one failure doesn't stop others
        const deletionPromises = filesToDelete.map(async (file) => {
            try {
                // 1. Delete the actual file chunks from GridFS
                await gfsBucket.delete(file.gridFsId);
                logger.info(`Deleted file from GridFS: ${file.filename}`);

                // 2. Delete the metadata record from our File collection
                await File.findByIdAndDelete(file._id);
                logger.info(`Deleted record from DB: ${file.filename}`);

                // 3. Update User's usedStorage
                if (file.owner) {
                    const User = require('../models/User'); // Lazy load to avoid circular dependency issues if any
                    await User.findByIdAndUpdate(file.owner, {
                        $inc: { usedStorage: -file.size }
                    });
                    logger.info(`Updated storage for user ${file.owner}: -${file.size} bytes`);
                }

            } catch (e) {
                // Log specific error but allow other files to be processed
                logger.error(`Error deleting ${file.filename}: ${e.message}`);
            }
        });

        await Promise.allSettled(deletionPromises);
        logger.info(`Auto-delete job completed. Processed ${filesToDelete.length} files.`);

    } catch (err) {
        logger.error(`Critical error in auto-delete cron job: ${err.message}`);
    }
};

const start = () => {
    // Schedule task to run at the start of every hour
    cron.schedule('0 * * * *', runAutoDelete);
};

module.exports = { start, runAutoDelete };
