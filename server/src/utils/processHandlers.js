/**
 * Registers process-level safety nets so uncaught errors are logged
 * instead of only dumped to stderr by Node's default handling.
 */

const mongoose = require('mongoose');
const logger = require('./logger');

/** How long to wait for in-flight requests to drain before forcing exit. */
const SHUTDOWN_TIMEOUT_MS = 10000;

/**
 * Logs unhandled promise rejections (the process keeps running, since
 * these are typically recoverable and isolated) and uncaught exceptions
 * (the process exits, since state may be corrupted after a synchronous
 * throw escapes all handlers).
 */
const registerProcessErrorHandlers = () => {
    process.on('unhandledRejection', (reason) => {
        logger.error('Unhandled promise rejection', reason instanceof Error ? reason : new Error(String(reason)));
    });

    process.on('uncaughtException', (err) => {
        logger.error('Uncaught exception', err instanceof Error ? err : new Error(String(err)));
        process.exit(1);
    });
};

/**
 * Registers `SIGTERM`/`SIGINT` handlers for graceful shutdown: stops the
 * HTTP server from accepting new connections, waits for in-flight
 * requests to finish, closes the Mongoose connection, then exits. Forces
 * an exit after `SHUTDOWN_TIMEOUT_MS` if `server.close` never calls back
 * (e.g. an open socket/keep-alive connection preventing full drain).
 *
 * @param {import('http').Server} server
 */
const registerShutdownHandlers = (server) => {
    let shuttingDown = false;

    const shutdown = (signal) => {
        if (shuttingDown) return;
        shuttingDown = true;

        logger.info(`${signal} received: starting graceful shutdown`);

        const forceExitTimer = setTimeout(() => {
            logger.error('Graceful shutdown timed out, forcing exit');
            process.exit(1);
        }, SHUTDOWN_TIMEOUT_MS);
        forceExitTimer.unref();

        server.close(async (err) => {
            if (err) {
                logger.error('Error while closing HTTP server', err);
            } else {
                logger.info('HTTP server closed');
            }

            try {
                await mongoose.disconnect();
                logger.info('MongoDB connection closed');
            } catch (mongoErr) {
                logger.error('Error closing MongoDB connection', mongoErr);
            }

            clearTimeout(forceExitTimer);
            process.exit(0);
        });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
};

module.exports = { registerProcessErrorHandlers, registerShutdownHandlers };
