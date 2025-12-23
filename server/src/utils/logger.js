const winston = require('winston');

/**
 * Log levels definition.
 * Lower numbers have higher priority.
 */
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
};

/**
 * Determine log level based on environment.
 * If the environment is development, use 'debug', otherwise use 'warn'.
 * @returns {string} 'debug' or 'warn'
 */
const level = () => {
    const env = process.env.NODE_ENV || 'development';
    const isDevelopment = env === 'development' || env === 'test';
    return isDevelopment ? 'debug' : 'warn';
};

/**
 * Colors for each log level.
 * These colors will be used in the console output.
 */
const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'white',
};

// Tell winston that you want to link the colors
winston.addColors(colors);

/**
 * Custom format for log messages.
 * Includes timestamp, colorization based on level, and a custom print format.
 */
const format = winston.format.combine(
    // Add the message timestamp with the preferred format
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    // Tell Winston that the logs must be colored
    winston.format.colorize({ all: true }),
    // Define the format of the message showing the timestamp, the level and the message
    winston.format.printf(
        (info) => `${info.timestamp} ${info.level}: ${info.message}`,
    ),
);

/**
 * Transports configuration.
 * Currently only logging to the console.
 */
const transports = [
    // Allow the use the console to print the messages
    new winston.transports.Console(),
];

/**
 * Logger instance configured with custom levels, format, and transports.
 * Exported for use throughout the application.
 */
const logger = winston.createLogger({
    level: level(),
    levels,
    format,
    transports,
});

module.exports = logger;
