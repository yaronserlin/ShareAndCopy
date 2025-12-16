import React from 'react';
import styles from './RateLimitError.module.css';

/**
 * Rate Limit Error Component
 * Full screen overlay displayed when user is rate limited.
 * @returns {JSX.Element} Rendered component
 */
const RateLimitError = () => {
    return (
        <div className={styles.overlay}>
            <h1 className={styles.title}>Too Many Requests</h1>
            <p className={styles.message}>
                You have made too many requests in a short period. Please wait a moment and try again.
            </p>
            <button
                onClick={() => window.location.reload()}
                className={styles.retryButton}
            >
                Reload Page
            </button>
        </div>
    );
};

export default RateLimitError;
