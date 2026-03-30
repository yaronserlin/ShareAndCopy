/**
 * Preview: client/src/components/common/FormInput.jsx
 * Description: Frontend application module.
 */

import React from 'react';
import PropTypes from 'prop-types';
import styles from '../../features/Auth/styles/AuthShared.module.css';

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
