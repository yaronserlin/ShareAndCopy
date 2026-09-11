/**
 * Preview: costant.js
 * Description: ShareAndCopy source file.
 */

import shared from './shared-constants.json';

// MAX_STORAGE_BYTES / FORBIDDEN_EXTENSIONS live in shared-constants.json so this
// file and server/src/utils/constants.js can't drift. REGEX can't be shared via
// JSON, so keep it identical to the copy in server/src/utils/constants.js.
export const APP_CONSTANTS = {
    MAX_STORAGE_BYTES: shared.MAX_STORAGE_BYTES,
    FORBIDDEN_EXTENSIONS: shared.FORBIDDEN_EXTENSIONS,
    REGEX: {

        EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,

        NAME: /^[A-Za-z]+$/,

        PASSWORD_STRONG: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/
    }
};
