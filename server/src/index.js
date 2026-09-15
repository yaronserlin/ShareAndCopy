/**
 * Express application entry point: configures security/parsing
 * middleware, mounts the API routes, and starts the HTTP + Socket.IO
 * server.
 */

const env = require('./config/env');
const express = require('express');
const http = require('http');
const helmet = require('helmet');
const compression = require('compression');

const logger = require('./utils/logger');
const initSocket = require('./socket');
const { apiLimiter } = require('./middleware/rateLimiter');
const cors = require('./middleware/cors');
const connectDB = require('./config/db');
const { parseCookies } = require('./utils/cookies');
const requestId = require('./middleware/requestId');
const errorHandler = require('./middleware/error');
const { registerProcessErrorHandlers, registerShutdownHandlers } = require('./utils/processHandlers');

const app = express();
const server = http.createServer(app);

app.set('trust proxy', 1);

app.use(requestId);

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", 'data:', 'https:'],
            // `env.PUBLIC_URL` defaults to the sentinel `'*'` when unset
            // (see config/env.js). Here it's a real Helmet CSP wildcard,
            // so unlike cors.js (where '*' is inert) we must not let it
            // fall through: default to 'self'-only connect-src rather than
            // allowing every origin.
            connectSrc: ["'self'",
                (env.PUBLIC_URL && env.PUBLIC_URL !== '*') ? env.PUBLIC_URL : ''
            ].filter(Boolean),
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"]
        }
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    },
    frameguard: {
        action: 'deny'
    }
}));

app.use(compression());

app.use(cors);

app.use((req, res, next) => {
    req.cookies = parseCookies(req.headers.cookie);
    next();
});

app.use((req, res, next) => {
    const startedAt = process.hrtime.bigint();

    res.on('finish', () => {
        const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
        req.log.http(`${req.method} ${req.originalUrl} - IP: ${req.ip} - ${res.statusCode} - ${durationMs.toFixed(1)}ms`);
    });

    next();
});

app.use('/api', apiLimiter);

app.use(express.json());

const routes = [
    { path: '/api/auth', route: './routes/auth' },
    { path: '/api/push', route: './routes/push' },
    { path: '/api/admin', route: './routes/admin' },
    { path: '/api/system', route: './routes/system' },
    { path: '/metrics', route: './routes/metrics' }
];

routes.forEach(({ path, route }) => {
    app.use(path, require(route));
});

app.use(errorHandler);

/**
 * Connects to MongoDB, initializes Socket.IO on the shared HTTP server,
 * and starts listening for HTTP requests.
 *
 * @returns {Promise<void>}
 */
const startServer = async () => {
    try {
        await connectDB();

        initSocket(server);
        logger.info('Socket.io initialized');

        const PORT = env.PORT || 5001;

        server.listen(PORT, '0.0.0.0', () => logger.info(`Server running on port ${PORT}`));
    } catch (err) {
        logger.error(`Failed to start server: ${err.message}`);
        process.exit(1);
    }
};

if (require.main === module) {
    registerProcessErrorHandlers();
    registerShutdownHandlers(server);
    startServer();
}

module.exports = app;
