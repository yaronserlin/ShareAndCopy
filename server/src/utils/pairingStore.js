/**
 * In-memory store for active device-pairing codes. Codes are single-use
 * and self-expire after their TTL; this is process-local state, so it
 * does not survive a server restart or work across multiple instances.
 */

const pairingCodes = new Map();

/**
 * Registers a pairing code, auto-expiring it after `ttlMs`.
 *
 * @param {string} code
 * @param {string} userId - ID of the user who owns this pairing code.
 * @param {string} token - The pairing-scoped JWT associated with the code.
 * @param {number} ttlMs - Time to live, in milliseconds.
 */
const set = (code, userId, token, ttlMs) => {
    pairingCodes.set(code, { userId, token });
    setTimeout(() => pairingCodes.delete(code), ttlMs).unref();
};

/**
 * @param {string} code
 * @returns {{userId: string, token: string}|undefined} The entry, if it exists and hasn't expired.
 */
const get = (code) => pairingCodes.get(code);

/**
 * Retrieves and removes a pairing code, so it can only be redeemed once.
 *
 * @param {string} code
 * @returns {{userId: string, token: string}|undefined} The entry, if it existed.
 */
const consume = (code) => {
    const entry = pairingCodes.get(code);
    if (entry) {
        pairingCodes.delete(code);
    }
    return entry;
};

/**
 * @param {string} code
 * @param {string} userId
 * @returns {boolean} Whether `userId` owns the given pairing code.
 */
const isOwner = (code, userId) => {
    const entry = pairingCodes.get(code);
    return !!entry && entry.userId === userId;
};

module.exports = { set, get, consume, isOwner };
