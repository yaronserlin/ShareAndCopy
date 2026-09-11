/**
 * Preview: server/src/utils/constants.js
 * Description: Server utility helper.
 */

const shared = require('../../../shared-constants.json');

// MAX_STORAGE_BYTES / FORBIDDEN_EXTENSIONS live in shared-constants.json so this
// file and costant.js can't drift. REGEX can't be shared via JSON, so keep it
// identical to the copy in costant.js.
const APP_CONSTANTS = {
    MAX_STORAGE_BYTES: shared.MAX_STORAGE_BYTES,
    FORBIDDEN_EXTENSIONS: shared.FORBIDDEN_EXTENSIONS,
    REGEX: {
        EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        NAME: /^\p{L}+(?:[' -]\p{L}+)*$/u,
        PASSWORD_STRONG: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/
    }
};

module.exports = {
    APP_CONSTANTS,
    MAX_STORAGE_BYTES: APP_CONSTANTS.MAX_STORAGE_BYTES,
    FORBIDDEN_EXTENSIONS: APP_CONSTANTS.FORBIDDEN_EXTENSIONS
};