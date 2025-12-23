/**
 * Environment Configuration Module
 * 
 * This module is responsible for loading, validating, and exporting
 * environment variables used throughout the application.
 */

const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

/**
 * List of environment variables that must be present for the application to start.
 */
const requiredEnvVars = [
    'MONGO_URI',
    'JWT_SECRET'
];

// Validate required environment variables
const missingVars = requiredEnvVars.filter(key => !process.env[key]);
if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
}

/**
 * Exported configuration object containing validated environment variables.
 * Defaults are provided for optional variables.
 */
module.exports = {
    // Server port (default: 5000)
    PORT: process.env.PORT || 5000,

    // Database connection string
    MONGO_URI: process.env.MONGO_URI,

    // Secret key for JWT signing
    JWT_SECRET: process.env.JWT_SECRET,

    // Rate limiting: window size in milliseconds (default: 1 minute)
    RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60000,

    // Rate limiting: max requests per window (default: 100)
    RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,

    // Public facing URL of the application
    PUBLIC_URL: process.env.PUBLIC_URL,

    // Application environment (default: development)
    NODE_ENV: process.env.NODE_ENV || 'development'
};
