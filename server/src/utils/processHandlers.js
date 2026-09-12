/**
 * Registers process-level safety nets so uncaught errors are logged
 * instead of only dumped to stderr by Node's default handling.
 */

const logger = require('./logger');

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

module.exports = { registerProcessErrorHandlers };
