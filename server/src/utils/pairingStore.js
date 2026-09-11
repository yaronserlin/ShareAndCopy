const pairingCodes = new Map();

const set = (code, userId, token, ttlMs) => {
    pairingCodes.set(code, { userId, token });
    setTimeout(() => pairingCodes.delete(code), ttlMs).unref();
};

const get = (code) => pairingCodes.get(code);

const consume = (code) => {
    const entry = pairingCodes.get(code);
    if (entry) {
        pairingCodes.delete(code);
    }
    return entry;
};

const isOwner = (code, userId) => {
    const entry = pairingCodes.get(code);
    return !!entry && entry.userId === userId;
};

module.exports = { set, get, consume, isOwner };
