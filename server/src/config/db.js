/**
 * MongoDB connection setup for the server.
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');
const env = require('./env');

/**
 * Connects to MongoDB using `MONGO_URI`, exiting the process on failure.
 *
 * @returns {Promise<import('mongoose').Connection>}
 */
const connectDB = async () => {
    try {
        const conn = await mongoose.connect(env.MONGO_URI);

        logger.info(`MongoDB Connected: ${conn.connection.host}`);

        return conn.connection;
    } catch (error) {
        logger.error(`Error connecting to MongoDB: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;
