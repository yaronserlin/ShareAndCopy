/**
 * Preview: server/src/config/env.js
 * Description: Server configuration helper.
 */

const dotenv = require('dotenv');


dotenv.config();


const requiredEnvVars = [
    'MONGO_URI',
    'JWT_SECRET'
];


const missingVars = requiredEnvVars.filter(key => !process.env[key]);
if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
}


module.exports = {

    PORT: process.env.PORT || 5000,


    MONGO_URI: process.env.MONGO_URI,


    JWT_SECRET: process.env.JWT_SECRET,


    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,


    RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60000,


    RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,


    PUBLIC_URL: process.env.PUBLIC_URL || '*',


    NODE_ENV: process.env.NODE_ENV || 'development',


    TURN_SECRET: process.env.TURN_SECRET || 'dev_secret',
    TURN_URL: process.env.TURN_URL,
    TURN_USER: process.env.TURN_USER || 'user',


};
