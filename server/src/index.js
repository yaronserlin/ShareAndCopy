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
const cors = require('./middleware/cors');
const connectDB = require('./config/db');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// --- Middleware Configuration ---

// Security headers
app.use(helmet());

// Gzip compression
app.use(compression());

// CORS configuration
app.use(cors);

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
    { path: '/api/system', route: './routes/system' }
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

        // --- Socket.io Initialization ---
        initSocket(server);
        logger.info('Socket.io initialized');

        // --- Server Startup ---
        const PORT = env.PORT || 5000;

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
