import React from 'react';
import '../styles/Auth.css';

const AuthLayout = ({ children, title, subtitle, onSwitchMode, switchText }) => {
    return (
        <div className="d-flex justify-content-center align-items-center vh-100 position-relative overflow-hidden">
            {/* Background Decorations */}
            <div className="auth-blob auth-blob-1"></div>
            <div className="auth-blob auth-blob-2"></div>
            <div className="auth-blob auth-blob-3"></div>

            <div className="position-relative z-1 w-100 p-4 p-md-5 glass-panel rounded-4 m-3 auth-card">
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

export default AuthLayout;
