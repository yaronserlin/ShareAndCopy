/**
 * Preview: client/src/features/Auth/components/AuthLayout/AuthLayout.jsx
 * Description: Frontend application module.
 */

import React from 'react';
import PropTypes from 'prop-types';
import styles from './AuthLayout.module.css';


const AuthLayout = ({ children, title, subtitle, onSwitchMode, switchText }) => {
    return (
        <div className="d-flex justify-content-center align-items-center flex-grow-1 position-relative overflow-hidden">
            {}


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
