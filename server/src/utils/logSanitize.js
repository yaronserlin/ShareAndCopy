/**
 * Helpers for masking sensitive values before they're written to logs.
 */

/**
 * Masks an email's local part, keeping up to the first two characters
 * and the domain (e.g. `jo***@example.com`). Falls back to fully
 * masking anything that isn't a plausible `local@domain` string, so a
 * short or malformed local part never leaks the full address.
 *
 * @param {string} email
 * @returns {string}
 */
const maskEmail = (email) => {
    if (typeof email !== 'string') return email;
    const atIndex = email.indexOf('@');
    if (atIndex === -1) return '***';

    const local = email.slice(0, atIndex);
    const domain = email.slice(atIndex);
    const visible = local.slice(0, Math.min(2, local.length));
    return `${visible}***${domain}`;
};

/**
 * Masks a room ID, which doubles as a bearer secret for guest pairing in
 * this app, keeping only the first 4 characters (e.g. `a1b2***`).
 *
 * @param {string} roomId
 * @returns {string}
 */
const maskRoomId = (roomId) => {
    if (typeof roomId !== 'string') return roomId;
    if (roomId.length <= 4) return '***';
    return `${roomId.slice(0, 4)}***`;
};

/**
 * Masks a device-pairing code, a short (6-character) single-use bearer
 * secret — fully redacted since so few characters offer no safe partial
 * reveal.
 *
 * @param {string} code
 * @returns {string}
 */
const maskPairingCode = (code) => {
    if (typeof code !== 'string') return code;
    return '***';
};

module.exports = { maskEmail, maskRoomId, maskPairingCode };
