/**
 * Winston logger configured for colorized console output in
 * development/test and structured JSON in production, with a verbosity
 * level that scales with the environment (overridable via `LOG_LEVEL`).
 */

const winston = require('winston');

const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
};

/**
 * Resolves the active log level: an explicit `LOG_LEVEL` env var wins if
 * it names a known level, otherwise `debug` in development/test and
 * `warn` otherwise.
 */
const level = () => {
    const requested = process.env.LOG_LEVEL;
    if (requested && Object.prototype.hasOwnProperty.call(levels, requested)) {
        return requested;
    }

    const env = process.env.NODE_ENV || 'development';
    const isDevelopment = env === 'development' || env === 'test';
    return isDevelopment ? 'debug' : 'warn';
};

const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'gray',
};

winston.addColors(colors);

const isProduction = process.env.NODE_ENV === 'production';

const format = winston.format.combine(
    winston.format.errors({ stack: true }),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.splat(),
    isProduction
        ? winston.format.json()
        : winston.format.combine(
            winston.format.colorize({ all: true }),
            winston.format.printf(({ timestamp, level: lvl, message, stack, requestId, socketId }) => {
                const id = requestId || socketId;
                const line = `${timestamp} ${lvl}: ${id ? `[${id}] ` : ''}${message}`;
                return stack ? `${line}\n${stack}` : line;
            }),
        ),
);

const transports = [
    new winston.transports.Console(),
];

const logger = winston.createLogger({
    level: level(),
    levels,
    format,
    transports,
});

module.exports = logger;
