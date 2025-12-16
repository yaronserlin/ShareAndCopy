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

const apiLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || (1 * 60 * 1000)), // 1 minutes or configurable via env
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || 100), // 100 requests per windowMs or configurable via env
    message: 'Too many requests from this IP, please try again later.',
    handler: (req, res) => {
        logger.warn(`Rate limit exceeded for IP: ${req.ip} on route: ${req.originalUrl}`);
        res.status(429).json({
            message: 'Too many requests from this IP, please try again later.',
            retryAfter: req.rateLimit.resetTime ? Math.ceil((req.rateLimit.resetTime.getTime() - Date.now()) / 1000) : null
        });
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    store: undefined // Use default MemoryStore, consider Redis or other for production
});
app.use('/api', apiLimiter); // Apply to API routes

// Middleware 
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        // Allowed origins regex
        const allowedOrigins = [
            /^http:\/\/localhost:\d+$/,
            /^https:\/\/localhost:\d+$/,
            /^http:\/\/127\.0\.0\.1:\d+$/,
            /^https:\/\/127\.0\.0\.1:\d+$/
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
app.use('/api/admin', require('./routes/admin'));

// Start Cron Job
cronJob.start();

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => logger.info(`Server running on port ${PORT}`));

