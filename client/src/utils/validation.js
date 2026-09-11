/**
 * Field-level validation used by the Auth forms.
 */

import { APP_CONSTANTS } from '../constants';

/**
 * Validates a single form field by name.
 *
 * @param {string} name - Field name (`firstName`, `lastName`, `email`, `password`, `confirmPassword`).
 * @param {string} value - Current field value.
 * @param {boolean} [isLogin=false] - Relaxes password strength rules for the login form.
 * @param {string} [password=''] - The password value, used to validate `confirmPassword`.
 * @returns {string|null} An error message, or `null` if the field is valid.
 */
export const validateField = (name, value, isLogin = false, password = '') => {
    let error = null;
    const { REGEX } = APP_CONSTANTS;

    switch (name) {
        case 'firstName':
        case 'lastName':
            if (!value) error = 'Required';
            else if (!REGEX.NAME.test(value)) error = 'Only letters allowed';
            break;
        case 'email':
            if (!value) error = 'Required';
            else if (!REGEX.EMAIL.test(value)) error = 'Invalid email address';
            break;
        case 'password':
            if (!value) error = 'Required';
            else if (!isLogin) {
                if (!REGEX.PASSWORD_STRONG.test(value)) {
                    error = 'Min 8 chars, 1 uppercase, 1 lowercase, 1 number';
                }
            }
            break;
        case 'confirmPassword':
            if (!value) error = 'Required';
            else if (value !== password) error = 'Passwords do not match';
            break;
        default:
            break;
    }
    return error;
};
