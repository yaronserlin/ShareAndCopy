const mongoose = require('mongoose');
const logger = require('../utils/logger');
const env = require('./env');

/**
 * Establishes a connection to the MongoDB database and initializes GridFS.
 *
 * @returns {Promise<{connection: mongoose.Connection, gfsBucket: mongoose.mongo.GridFSBucket}>}
 *          An object containing the active Mongoose connection and the GridFS bucket instance.
 * @throws {Error} If the connection fails, the process exits with status code 1.
 */
const connectDB = async () => {
    try {
        // Connect to MongoDB using the URI from environment variables
        // Note: Mongoose 6+ defaults to useNewUrlParser: true, useUnifiedTopology: true
        const conn = await mongoose.connect(env.MONGO_URI);

        logger.info(`MongoDB Connected: ${conn.connection.host}`);

        return conn.connection;
    } catch (error) {
        // Log the error and exit the process to prevent running without a DB connection
        logger.error(`Error connecting to MongoDB: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;
