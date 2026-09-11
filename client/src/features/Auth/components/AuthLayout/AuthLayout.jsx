/**
 * Shared centered-card layout for the login and register screens, with a
 * title, subtitle, form content, and an optional mode-switch link.
 */

import React from 'react';
import PropTypes from 'prop-types';
import styles from './AuthLayout.module.css';

/**
 * @param {Object} props
 * @param {React.ReactNode} props.children - The form content to render inside the card.
 * @param {string} props.title - Card heading.
 * @param {string} props.subtitle - Card subheading.
 * @param {Function} [props.onSwitchMode] - Called when the switch-mode link is clicked.
 * @param {string} [props.switchText] - Label for the switch-mode link.
 * @returns {JSX.Element} The auth card layout.
 */
const AuthLayout = ({ children, title, subtitle, onSwitchMode, switchText }) => {
    return (
        <div className="d-flex justify-content-center align-items-center flex-grow-1 position-relative overflow-hidden">
            <div className={`position-relative z-1 w-100 p-4 glass-panel rounded-4 m-3 ${styles.authCard}`}>
                <div className="text-center mb-4">
                    <h2 className="display-6 fw-bold mb-2">
                        {title}
                    </h2>
                    <p className="text-secondary small">
                        {subtitle}
                    </p>
                </div>

                {children}

                {onSwitchMode && (
                    <div className="mt-4 text-center">
                        <button
                            className="btn btn-link text-secondary text-decoration-none small"
                            onClick={onSwitchMode}
                        >
                            {switchText}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

AuthLayout.propTypes = {
    children: PropTypes.node.isRequired,
    title: PropTypes.string.isRequired,
    subtitle: PropTypes.string.isRequired,
    onSwitchMode: PropTypes.func,
    switchText: PropTypes.string
};

export default AuthLayout;
