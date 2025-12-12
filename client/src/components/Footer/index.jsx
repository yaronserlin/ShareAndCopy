import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Link } from 'react-router-dom';

const Footer = () => {
    const { theme, toggleTheme } = useTheme();

    return (
        <footer className="py-2 mt-auto border-top border-secondary border-opacity-10 glass-panel">
            <div className="container-fluid container-lg d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center gap-3 mx-auto">
                    <span className="text-secondary opacity-75 small">
                        © {new Date().getFullYear()} Share & Copy.
                    </span>
                    <Link to="/about" className="text-secondary opacity-75 small text-decoration-none hover-opacity">About</Link>
                </div>

                <button
                    onClick={toggleTheme}
                    className="btn btn-outline-secondary rounded-pill btn-sm d-flex align-items-center gap-2"
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
