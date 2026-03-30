/**
 * Preview: server/src/index.js
 * Description: Server backend module.
 */

const env = require('./config/env');
const express = require('express');
const http = require('http');
const helmet = require('helmet');
const compression = require('compression');


const logger = require('./utils/logger');
const initSocket = require('./socket');
const apiLimiter = require('./middleware/rateLimiter');
const cors = require('cors');
const connectDB = require('./config/db');


const app = express();
const server = http.createServer(app);




app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
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
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    },
    frameguard: {
        action: 'deny'
    }
}));


app.use(compression());


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


app.use((req, res, next) => {
    logger.info(`${req.method} ${req.originalUrl} - IP: ${req.ip}`);
    next();
});


app.use('/api', apiLimiter);


app.use(express.json());







const routes = [
    { path: '/api/auth', route: './routes/auth' },
    { path: '/api/admin', route: './routes/admin' },
    { path: '/api/system', route: './routes/system' },
    { path: '/metrics', route: './routes/metrics' }
];

routes.forEach(({ path, route }) => {
    app.use(path, require(route));
});







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
    startServer();
}

module.exports = app;
