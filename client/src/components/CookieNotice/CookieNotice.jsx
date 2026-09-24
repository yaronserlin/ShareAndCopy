/**
 * First-visit cookie disclosure. Share & Copy only sets strictly
 * necessary authentication cookies, so this is a disclosure (not a
 * consent banner): it tells the user which cookies exist and links to
 * the Privacy Policy. Dismissal is remembered in localStorage.
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { COOKIE_NOTICE } from '../../content/legalDocuments';

const STORAGE_KEY = 'cookie-notice-acknowledged';

/**
 * @returns {JSX.Element|null} The cookie notice bar, or null once acknowledged.
 */
const CookieNotice = () => {
    const [acknowledged, setAcknowledged] = useState(() => {
        try {
            return localStorage.getItem(STORAGE_KEY) === 'true';
        } catch {
            return true;
        }
    });

    if (acknowledged) return null;

    const dismiss = () => {
        try {
            localStorage.setItem(STORAGE_KEY, 'true');
        } catch {
            /* storage unavailable - just hide for this session */
        }
        setAcknowledged(true);
    };

    return (
        <div
            role="region"
            aria-label="Cookie notice"
            className="position-fixed bottom-0 start-0 end-0 glass-panel border-top border-secondary border-opacity-25 py-2 px-3"
            style={{ zIndex: 1050 }}
        >
            <div className="container d-flex flex-column flex-md-row align-items-md-center gap-2">
                <p className="flex-grow-1 small text-secondary mb-0">
                    {COOKIE_NOTICE}{' '}
                    <Link to="/privacy" className="fw-semibold text-decoration-underline" style={{ color: 'inherit' }}>Privacy Policy</Link>
                </p>
                <button
                    type="button"
                    className="btn btn-primary btn-sm px-3 flex-shrink-0"
                    onClick={dismiss}
                >
                    Got it
                </button>
            </div>
        </div>
    );
};

export default CookieNotice;
