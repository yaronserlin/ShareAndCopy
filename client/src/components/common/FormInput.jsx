/**
 * Reusable labeled text input with built-in validation styling and
 * helper/error text, used across the Auth forms.
 */

import React from 'react';
import PropTypes from 'prop-types';
import styles from '../../features/Auth/styles/AuthShared.module.css';

/**
 * Renders a labeled `<input>` with validation state, error message, and
 * optional helper text.
 *
 * @param {Object} props
 * @param {string} [props.label] - Label text shown above the input.
 * @param {string} [props.type='text'] - HTML input type.
 * @param {string} props.name - Input `name`/`id` and form field key.
 * @param {string|number} props.value - Current field value.
 * @param {Function} props.onChange - Change handler.
 * @param {Function} [props.onBlur] - Blur handler, used to mark the field touched.
 * @param {string} [props.placeholder] - Placeholder text.
 * @param {string} [props.error] - Validation error message, shown when `touched`.
 * @param {boolean} [props.touched] - Whether the field has been interacted with.
 * @param {boolean} [props.required=false] - Whether the field is required.
 * @param {string} [props.helperText] - Helper text shown when there is no error.
 * @param {string} [props.className=''] - Extra class names for the wrapper.
 * @returns {JSX.Element} The form input element.
 */
const FormInput = ({
    label,
    type = 'text',
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
    const isInvalid = touched && !!error;
    const isValid = touched && !error;

    return (
        <div className={className}>
            {label && (
                <label htmlFor={name} className="form-label text-secondary small fw-bold">
                    {label}
                </label>
            )}
            <input
                id={name}
                className={`form-control ${styles.authInput} ${touched ? (isInvalid ? 'is-invalid' : 'is-valid') : ''}`}
                type={type}
                name={name}
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                onBlur={onBlur}
                required={required}
            />
            {isInvalid ? (
                <div className="invalid-feedback">{error}</div>
            ) : (
                helperText && <div className="form-text small text-muted">{helperText}</div>
            )}
        </div>
    );
};

FormInput.propTypes = {
    label: PropTypes.string,
    type: PropTypes.string,
    name: PropTypes.string.isRequired,
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    onChange: PropTypes.func.isRequired,
    onBlur: PropTypes.func,
    placeholder: PropTypes.string,
    error: PropTypes.string,
    touched: PropTypes.bool,
    required: PropTypes.bool,
    helperText: PropTypes.string,
    className: PropTypes.string
};

export default FormInput;
