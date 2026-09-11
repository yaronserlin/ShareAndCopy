/**
 * Console logging helpers that are silent in production builds.
 */

const isDev = import.meta.env.DEV;

/** Logs to the console, but only in development builds. */
export const debugLog = (...args) => {
    if (isDev) console.log(...args);
};

/** Warns to the console, but only in development builds. */
export const debugWarn = (...args) => {
    if (isDev) console.warn(...args);
};
