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
    pairingCodes.set(code, { userId, token, redeemed: false });
    setTimeout(() => pairingCodes.delete(code), ttlMs).unref();
};

/**
 * @param {string} code
 * @returns {{userId: string, token: string, redeemed: boolean}|undefined} The entry, if it exists and hasn't expired.
 */
const get = (code) => pairingCodes.get(code);

/**
 * Redeems a pairing code for its one-time pairing token. The entry is
 * kept in place (rather than deleted) so `isOwner` still resolves for
 * the `approve-pairing` step that follows redemption in every real
 * pairing flow; it is only cleared by `remove` (on approval) or by its
 * own TTL expiry. A `redeemed` code can't be exchanged for its token a
 * second time.
 *
 * @param {string} code
 * @returns {{userId: string, token: string}|undefined} The entry, if it existed and hadn't already been redeemed.
 */
const consume = (code) => {
    const entry = pairingCodes.get(code);
    if (entry && !entry.redeemed) {
        entry.redeemed = true;
        return entry;
    }
    return undefined;
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

/**
 * Finalizes a pairing code, e.g. once it's been approved, so it can't be
 * used for any further pairing steps.
 *
 * @param {string} code
 */
const remove = (code) => pairingCodes.delete(code);

module.exports = { set, get, consume, isOwner, remove };
