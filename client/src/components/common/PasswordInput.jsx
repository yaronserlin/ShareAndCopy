import React, { useState } from 'react';
import PropTypes from 'prop-types';
import styles from '../../features/Auth/styles/AuthShared.module.css';

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
                    className={`form-control ${styles.authInput} ${touched ? (isInvalid ? 'is-invalid' : 'is-valid') : ''}`}
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
                    tabIndex="-1"
                >
                    <i className={`bi ${showPassword ? 'bi-eye-slash-fill' : 'bi-eye-fill'}`}></i>
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
