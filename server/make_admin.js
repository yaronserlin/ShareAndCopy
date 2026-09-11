/**
 * CLI script that promotes a user to admin by email address.
 *
 * Usage: `node make_admin.js <email>`
 */

const mongoose = require('mongoose');
const User = require('./src/models/User');
const path = require('path');
const logger = require('./src/utils/logger');
require('dotenv').config({ path: path.join(__dirname, '.env') });

/**
 * Connects to MongoDB, finds the user with the email given as the first
 * CLI argument, and sets `isAdmin` to `true` on their account.
 *
 * @returns {Promise<void>}
 */
const makeAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        logger.info('MongoDB Connected');

        const email = process.argv[2];
        if (!email) {
            logger.error('Please provide an email address as an argument.');
            process.exit(1);
        }
        logger.info(`Looking for user with email: ${email}`);
        const user = await User.findOne({ email });
        if (!user) {
            logger.error(`User with email ${email} not found.`);
            process.exit(1);
        }
        logger.info(`User found: ${user.email} - Current isAdmin: ${user.isAdmin}`);
        user.isAdmin = true;
        await user.save();
        logger.info(`User ${email} is now an Admin.`);

        process.exit();
    } catch (err) {
        logger.error(err);
        process.exit(1);
    }
};

makeAdmin();
