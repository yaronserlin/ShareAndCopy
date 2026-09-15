/**
 * Parses the `1h` / `30d` style durations used for token lifetimes (the
 * format `jsonwebtoken` accepts) into seconds, so cookie `maxAge`
 * attributes can be derived from the same configuration values rather
 * than hardcoded alongside them and drifting apart.
 */

const UNIT_SECONDS = {
    s: 1,
    m: 60,
    h: 60 * 60,
    d: 24 * 60 * 60,
    w: 7 * 24 * 60 * 60,
    y: 365 * 24 * 60 * 60
};

/**
 * Converts a duration to whole seconds.
 *
 * @param {string|number} value - `'1h'`, `'30d'`, `'90s'`, or a number of seconds.
 * @param {number} [fallbackSeconds=0] - Returned when `value` can't be parsed.
 * @returns {number} The duration in seconds.
 */
const toSeconds = (value, fallbackSeconds = 0) => {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return Math.floor(value);
    }

    if (typeof value !== 'string') {
        return fallbackSeconds;
    }

    const match = value.trim().match(/^(\d+(?:\.\d+)?)\s*(ms|s|m|h|d|w|y)?$/i);
    if (!match) {
        return fallbackSeconds;
    }

    const amount = parseFloat(match[1]);
    const unit = (match[2] || 's').toLowerCase();

    if (unit === 'ms') {
        return Math.floor(amount / 1000);
    }

    return Math.floor(amount * UNIT_SECONDS[unit]);
};

module.exports = { toSeconds };
