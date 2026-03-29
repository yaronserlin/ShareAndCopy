// Load environment variables and libraries
const env = require('./config/env');
const express = require('express');
const http = require('http');
const helmet = require('helmet');
const compression = require('compression');

// Load local utilities and middleware
const logger = require('./utils/logger');
const initSocket = require('./socket');
const apiLimiter = require('./middleware/rateLimiter');
const cors = require('cors'); // NPM package, not custom middleware
const connectDB = require('./config/db');
const redis = require('./config/redis');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// --- Middleware Configuration ---

// SECURITY: Security headers with Content Security Policy
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for React
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", 'data:', 'https:'],
            connectSrc: ["'self'",
                'http://localhost:*',
                'http://127.0.0.1:*',
                'ws://localhost:*',
                'ws://127.0.0.1:*',
                env.PUBLIC_URL || ''
            ].filter(Boolean),
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"]
        }
    },
    hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true
    },
    frameguard: {
        action: 'deny' // Prevent clickjacking
    }
}));

// Gzip compression
app.use(compression());

// CORS Configuration - SEC-06: Whitelist approach with localhost support  
const allowedOrigins = env.NODE_ENV === 'production'
    ? [env.PUBLIC_URL].filter(Boolean)
    : [
        'http://localhost:5173',
        'http://localhost:3000',
        'http://127.0.0.1:5173',
        'http://192.168.1.112:5173',
        'http://192.168.1.178:5173',
        env.PUBLIC_URL
    ].filter(Boolean);

const localOriginPattern = /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+)(:\d+)?$/;

// Configure CORS properly for development and production
app.use(cors({
    origin: env.NODE_ENV === 'production'
        ? (env.PUBLIC_URL ? [env.PUBLIC_URL] : false)
        : function (origin, callback) {
            if (!origin) return callback(null, true);
            if (allowedOrigins.includes(origin) || localOriginPattern.test(origin)) {
                return callback(null, true);
            }
            logger.warn(`Blocked by CORS: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token']
}));

// Request logging
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.originalUrl} - IP: ${req.ip}`);
    next();
});

// Rate limiting for API routes
app.use('/api', apiLimiter);

// Body parsing
app.use(express.json());

// Static file serving - DEPRECATED/REMOVED for P2P
// app.use('/uploads', express.static('uploads'));

// --- Database Connection and Startup ---

// --- Route Definitions ---
const routes = [
    { path: '/api/auth', route: './routes/auth' },
    { path: '/api/admin', route: './routes/admin' },
    { path: '/api/system', route: './routes/system' },
    { path: '/metrics', route: './routes/metrics' } // Expose metrics
];

routes.forEach(({ path, route }) => {
    app.use(path, require(route));
});

// --- Background Jobs ---
// Cron jobs removed for P2P migration
// cronJob.start();

// --- Database Connection and Startup ---

const startServer = async () => {
    try {
        await connectDB();
        logger.info('MongoDB connected');

        // Initialize Redis (non-blocking - will fallback to memory if unavailable)
        await redis.initRedis();

        // --- Socket.io Initialization ---
        initSocket(server);
        logger.info('Socket.io initialized');

        // --- Server Startup ---
        const PORT = env.PORT || 5001; // Changed from 5000 due to macOS ControlCenter

        server.listen(PORT, '0.0.0.0', () => logger.info(`Server running on port ${PORT}`));
    } catch (err) {
        logger.error(`Failed to start server: ${err.message}`);
        process.exit(1);
    }
};

if (require.main === module) {
    startServer();
}

module.exports = app;
