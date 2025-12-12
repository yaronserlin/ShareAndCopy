import React from 'react';
import { Link } from 'react-router-dom';

const GradientButton = ({ to, onClick, children, className = '', type = 'button', disabled = false }) => {
    const baseClasses = "btn btn-lg btn-primary rounded-pill px-5 py-3 fw-bold shadow-lg";
    const combinedClasses = `${baseClasses} ${className}`;
    const style = {
        background: 'linear-gradient(45deg, #6366f1, #ec4899)',
        border: 'none',
    };

    if (to) {
        return (
            <Link to={to} className={combinedClasses} style={style}>
                {children}
            </Link>
        );
    }

    return (
        <button type={type} onClick={onClick} className={combinedClasses} style={style} disabled={disabled}>
            {children}
        </button>
    );
};

export default GradientButton;
