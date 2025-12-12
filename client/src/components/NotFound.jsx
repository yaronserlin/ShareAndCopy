import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const NotFound = ({ title: propTitle, message: propMessage }) => {
    const location = useLocation();
    const { title, message } = location.state || {};

    const displayTitle = propTitle || title || 'Page Not Found';
    const displayMessage = propMessage || message || "Oops! The page you are looking for doesn't exist or has been moved.";

    return (
        <div className="d-flex flex-column justify-content-center align-items-center vh-100 transition-colors duration-300 text-center p-4">
            <h1 className="display-1 fw-bold text-primary mb-3" style={{ background: 'linear-gradient(to right, #6366f1, #ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                404
            </h1>
            <h2 className="mb-4 text-body">{displayTitle}</h2>
            <p className="lead text-secondary mb-5" style={{ maxWidth: '28rem' }}>
                {displayMessage}
            </p>
            <Link
                to="/"
                className="btn btn-primary px-5 py-3 rounded-pill fw-bold shadow-sm"
                style={{ background: '#4f46e5', borderColor: '#4f46e5' }}
            >
                Go Home
            </Link>
        </div>
    );
};

export default NotFound;
