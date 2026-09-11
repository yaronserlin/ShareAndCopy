/**
 * Primary call-to-action button with the app's signature gradient style.
 * Renders as a router `Link` when given a `to` target, otherwise as a
 * plain `<button>`.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import styles from './GradientButton.module.css';

/**
 * @param {Object} props
 * @param {string} [props.to] - Route to navigate to; renders a `Link` when set.
 * @param {Function} [props.onClick] - Click handler, used when `to` is not set.
 * @param {React.ReactNode} props.children - Button label/content.
 * @param {string} [props.className=''] - Extra class names.
 * @param {string} [props.type='button'] - Button `type` attribute (ignored when `to` is set).
 * @param {boolean} [props.disabled=false] - Disables the button (ignored when `to` is set).
 * @returns {JSX.Element} A gradient-styled link or button.
 */
const GradientButton = ({ to, onClick, children, className = '', type = 'button', disabled = false }) => {
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
