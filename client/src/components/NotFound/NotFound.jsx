import React from 'react';
import PropTypes from 'prop-types';
import { useLocation } from 'react-router-dom';
import BackgroundDecorations from '../common/BackgroundDecorations';
import GlassCard from '../common/GlassCard';
import GradientButton from '../common/GradientButton';
import styles from './NotFound.module.css';

/**
 * Not Found Page Component
 * Displays a 404 error message.
 * @param {Object} props - Component props
 * @param {string} [props.title] - Optional title override
 * @param {string} [props.message] - Optional message override
 * @returns {JSX.Element} Rendered component
 */
const NotFound = ({ title: propTitle, message: propMessage }) => {
    const location = useLocation();
    const { title, message } = location.state || {};

    const displayTitle = propTitle || title || 'Page Not Found';
    const displayMessage = propMessage || message || "Oops! The page you are looking for doesn't exist or has been moved.";

    return (
        <div className="d-flex flex-column justify-content-center align-items-center flex-grow-1 transition-colors duration-300 text-center p-4">
            <BackgroundDecorations />
            <GlassCard className="p-5">
                <h1 className={`display-1 fw-bold text-primary mb-3 ${styles.notFoundTitle}`}>
                    404
                </h1>
                <h2 className="mb-4 text-body">{displayTitle}</h2>
                <p className={`lead text-secondary mb-5 ${styles.notFoundMessage}`}>
                    {displayMessage}
                </p>
                <GradientButton to="/" className="px-5 py-3 rounded-pill fw-bold shadow-sm">
                    Go Home
                </GradientButton>
            </GlassCard>
        </div>
    );
};

NotFound.propTypes = {
    title: PropTypes.string,
    message: PropTypes.string
};

export default NotFound;
