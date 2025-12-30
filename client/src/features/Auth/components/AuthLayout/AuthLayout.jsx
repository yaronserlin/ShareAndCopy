import React from 'react';
import PropTypes from 'prop-types';
import styles from './AuthLayout.module.css';

/**
 * Auth Layout Component
 * Layout wrapper for authentication pages.
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @param {string} props.title - Page title
 * @param {string} props.subtitle - Page subtitle
 * @param {Function} [props.onSwitchMode] - Handler to switch auth mode
 * @param {string} [props.switchText] - Text for switch button
 * @returns {JSX.Element} Rendered component
 */
const AuthLayout = ({ children, title, subtitle, onSwitchMode, switchText }) => {
    return (
        <div className="d-flex justify-content-center align-items-center flex-grow-1 position-relative overflow-hidden">
            {/* Background Decorations */}


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
