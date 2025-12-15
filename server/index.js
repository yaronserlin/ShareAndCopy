require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cronJob = require('./utils/cron');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const logger = require('./utils/logger');

const app = express();

// Logging Middleware
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.originalUrl} - IP: ${req.ip}`);
    next();
});
// Security & Optimization Middleware
app.use(helmet()); // Secure HTTP headers
app.use(compression()); // Compress responses

// Rate Limiting (DDoS Protection)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api', limiter); // Apply to API routes

// Middleware 
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        // Allowed origins regex
        const allowedOrigins = [
            /^http:\/\/localhost:\d+$/,
            /^http:\/\/127\.0\.0\.1:\d+$/,
            /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}:\d+$/,
            /^http:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d+$/,
            /^http:\/\/172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}:\d+$/,
            /^http:\/\/169\.254\.171\.173:\d+$/,
            /^https:\/\/troubleshooting-lcd-convinced-just\.trycloudflare\.com(:.*)?$/
        ];

        // Add dynamic PUBLIC_URL if it exists (from startup.sh)
        if (process.env.PUBLIC_URL) {
            // Convert string URL to regex (escape special chars)
            const safeUrl = process.env.PUBLIC_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            allowedOrigins.push(new RegExp(`^${safeUrl}(:.*)?$`));
        }

        const isAllowed = allowedOrigins.some(regex => regex.test(origin));

        if (isAllowed) {
            callback(null, true);
        } else {
            logger.warn(`Blocked by CORS: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization", "Access-Control-Allow-Origin", "x-auth-token"],
    exposedHeaders: ["x-iv"]
}));
app.use(express.json());
app.use('/uploads', express.static('uploads')); // Serve uploaded files

// Database Connection
let gfsBucket;

mongoose.connect(process.env.MONGO_URI)
    .then((conn) => {
        logger.info('MongoDB Connected');
        gfsBucket = new mongoose.mongo.GridFSBucket(conn.connection.db, {
            bucketName: 'uploads'
        });
        app.locals.gfsBucket = gfsBucket; // Make accessible globally
    })
    .catch(err => logger.error(`MongoDB connection error: ${err}`));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/files', require('./routes/files'));
app.use('/api/system', require('./routes/system'));

// Start Cron Job
cronJob.start();

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => logger.info(`Server running on port ${PORT}`));

