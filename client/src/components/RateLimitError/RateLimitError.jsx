/**
 * Full-screen notice shown when the client has been rate-limited by the
 * server, replacing the entire app while the condition persists.
 */

import React from 'react';
import styles from './RateLimitError.module.css';

/**
 * Renders the rate-limit overlay with a reload action.
 *
 * @returns {JSX.Element} The rate-limit notice element.
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
