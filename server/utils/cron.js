const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const File = require('../models/File');

const start = () => {
    // Run every hour
    cron.schedule('0 * * * *', async () => {
        console.log('Running auto-delete cron job...');
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        try {
            const filesToDelete = await File.find({ createdAt: { $lt: twentyFourHoursAgo } });

            // Create a fresh bucket instance since we are not in a request context
            // Assumes mongoose is connected
            if (mongoose.connection.readyState !== 1) return;
            const gfsBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
                bucketName: 'uploads'
            });

            for (const file of filesToDelete) {
                // Delete from GridFS
                try {
                    await gfsBucket.delete(file.gridFsId);
                    console.log(`Deleted file from GridFS: ${file.filename}`);
                } catch (e) {
                    console.error(`Error deleting ${file.filename} from GridFS:`, e.message);
                }

                // Delete from DB
                await File.findByIdAndDelete(file._id);
                console.log(`Deleted record from DB: ${file.filename}`);
            }
        } catch (err) {
            console.error('Error in cron job:', err);
        }
    });
};

module.exports = { start };
