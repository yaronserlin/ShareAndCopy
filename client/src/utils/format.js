/**
 * Formatting helpers for displaying data in the UI.
 */

/**
 * Formats a byte count as a human-readable string with the appropriate
 * unit (Bytes, KB, MB, ...).
 *
 * @param {number} bytes
 * @param {number} [decimals=2] - Decimal places to keep.
 * @returns {string} The formatted size, e.g. "1.5 MB".
 */
export const formatBytes = (bytes, decimals = 2) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};
