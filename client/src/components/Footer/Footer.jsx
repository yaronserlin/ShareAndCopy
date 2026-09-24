/**
 * Site footer with the copyright line, an About link, and a theme toggle.
 */

import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Link } from 'react-router-dom';
import styles from './Footer.module.css';

/**
 * Renders the persistent app footer.
 *
 * @returns {JSX.Element} The footer element.
 */
const Footer = () => {
    const { theme, toggleTheme } = useTheme();

    return (
        <footer className={`py-2 mt-auto border-top border-secondary border-opacity-10 glass-panel ${styles.footerContainer}`}>
            <div className="container-fluid container-lg d-flex justify-content-between align-items-center gap-2">
                <div className="d-flex flex-wrap align-items-center justify-content-center column-gap-3 row-gap-1 mx-auto">
                    <span className="text-secondary opacity-75 small text-nowrap">
                        © {new Date().getFullYear()} Share & Copy.
                    </span>
                    <Link to="/about" className="text-secondary small text-decoration-none hover-opacity">About</Link>
                    <Link to="/terms" className="text-secondary small text-decoration-none hover-opacity">Terms</Link>
                    <Link to="/privacy" className="text-secondary small text-decoration-none hover-opacity">Privacy</Link>
                    <Link to="/accessibility" className="text-secondary small text-decoration-none hover-opacity">Accessibility</Link>
                </div>

                <button
                    onClick={toggleTheme}
                    className="btn btn-outline-secondary rounded-pill btn-sm d-flex align-items-center gap-2 flex-shrink-0"
                    title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                >
                    {theme === 'dark' ? (
                        <>
                            <i className="bi bi-sun-fill"></i>
                            <span className="d-none d-sm-inline">Light Mode</span>
                        </>
                    ) : (
                        <>
                            <i className="bi bi-moon-stars-fill"></i>
                            <span className="d-none d-sm-inline">Dark Mode</span>
                        </>
                    )}
                </button>
            </div>
        </footer>
    );
};

export default Footer;
