import React from 'react';
import { Link } from 'react-router-dom';
import styles from './GradientButton.module.css';

const GradientButton = ({ to, onClick, children, className = '', type = 'button', disabled = false }) => {
    // Note: retaining bootstrap classes for layout/typography
    const baseClasses = `btn btn-lg rounded-pill px-5 py-3 fw-bold shadow-lg ${styles.btnGradient}`;
    const combinedClasses = `${baseClasses} ${className}`;

    if (to) {
        return (
            <Link to={to} className={combinedClasses}>
                {children}
            </Link>
        );
    }

    return (
        <button type={type} onClick={onClick} className={combinedClasses} disabled={disabled}>
            {children}
        </button>
    );
};

export default GradientButton;
