import React from 'react';
import { Link } from 'react-router-dom';
import './GradientButton.css';

const GradientButton = ({ to, onClick, children, className = '', type = 'button', disabled = false }) => {
    const baseClasses = "btn btn-lg btn-gradient rounded-pill px-5 py-3 fw-bold shadow-lg";
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
