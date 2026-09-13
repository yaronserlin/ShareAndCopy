/**
 * Password field with a show/hide toggle and the same validation styling
 * as {@link module:common/FormInput}.
 */

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import styles from '../../features/Auth/styles/AuthShared.module.css';

/**
 * Renders a password `<input>` with a visibility toggle, validation
 * state, error message, and optional helper text.
 *
 * @param {Object} props
 * @param {string} [props.label] - Label text shown above the input.
 * @param {string} props.name - Input `name`/`id` and form field key.
 * @param {string} props.value - Current field value.
 * @param {Function} props.onChange - Change handler.
 * @param {Function} [props.onBlur] - Blur handler, used to mark the field touched.
 * @param {string} [props.placeholder] - Placeholder text.
 * @param {string} [props.error] - Validation error message, shown when `touched`.
 * @param {boolean} [props.touched] - Whether the field has been interacted with.
 * @param {boolean} [props.required=false] - Whether the field is required.
 * @param {string} [props.helperText] - Helper text shown when there is no error.
 * @param {string} [props.className=''] - Extra class names for the wrapper.
 * @returns {JSX.Element} The password input element.
 */
const PasswordInput = ({
    label,
    name,
    value,
    onChange,
    onBlur,
    placeholder,
    error,
    touched,
    required = false,
    helperText = null,
    className = ''
}) => {
    const [showPassword, setShowPassword] = useState(false);
    const isInvalid = touched && !!error;
    const isValid = touched && !error;

    return (
        <div className={className}>
            {label && (
                <label htmlFor={name} className="form-label text-secondary small fw-bold">
                    {label}
                </label>
            )}
            <div className="input-group">
                <input
                    id={name}
                    className={`form-control ${styles.authInput} ${isInvalid ? 'is-invalid' : isValid ? 'is-valid' : ''}`}
                    type={showPassword ? "text" : "password"}
                    name={name}
                    placeholder={placeholder}
                    value={value}
                    onChange={onChange}
                    onBlur={onBlur}
                    required={required}
                />
                <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ zIndex: 0 }}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                >
                    <i className={`bi ${showPassword ? 'bi-eye-slash-fill' : 'bi-eye-fill'}`} aria-hidden="true"></i>
                </button>
                {isInvalid && <div className="invalid-feedback">{error}</div>}
            </div>
            {!isInvalid && helperText && <div className="form-text small text-muted">{helperText}</div>}
        </div>
    );
};

PasswordInput.propTypes = {
    label: PropTypes.string,
    name: PropTypes.string.isRequired,
    value: PropTypes.string.isRequired,
    onChange: PropTypes.func.isRequired,
    onBlur: PropTypes.func,
    placeholder: PropTypes.string,
    error: PropTypes.string,
    touched: PropTypes.bool,
    required: PropTypes.bool,
    helperText: PropTypes.string,
    className: PropTypes.string
};

export default PasswordInput;
