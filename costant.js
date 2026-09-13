/**
 * Application constants shared between the client and the server.
 *
 * `MAX_STORAGE_BYTES` and `FORBIDDEN_EXTENSIONS` live in
 * `shared-constants.json` so this file and `server/src/utils/constants.js`
 * can't drift apart. `REGEX` can't be shared via JSON, so it must be kept
 * identical to the copy in `server/src/utils/constants.js` by hand.
 */

import shared from './shared-constants.json';

export const APP_CONSTANTS = {
    MAX_STORAGE_BYTES: shared.MAX_STORAGE_BYTES,
    FORBIDDEN_EXTENSIONS: shared.FORBIDDEN_EXTENSIONS,
    REGEX: {
        EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        NAME: /^\p{L}+(?:[' -]\p{L}+)*$/u,
        PASSWORD_STRONG: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d!@#$%^&*()]{8,}$/
    }
};
