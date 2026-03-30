/**
 * Preview: server/src/config/db.js
 * Description: Server configuration helper.
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');
const env = require('./env');


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
