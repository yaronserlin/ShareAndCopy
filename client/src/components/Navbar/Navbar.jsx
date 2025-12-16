import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import logo from '../../assets/logo_v2.svg';
import { useAuth } from '../../context/AuthContext';
import styles from './Navbar.module.css';

/**
 * Navbar Component
 * Navigation bar for the application.
 * @returns {JSX.Element} Rendered component
 */
const Navbar = () => {
    const navigate = useNavigate();
    const { user, token, roomId, logout } = useAuth();

    const handleLogout = () => {
        logout();
    };

    return (
        <nav className={`navbar navbar-expand-lg fixed-top glass-panel border-0 border-bottom border-secondary border-opacity-10 ${styles.navbarCustom}`}>
            <div className="container-fluid container-lg d-flex justify-content-between align-items-center">
                <Link className="navbar-brand fw-bold fs-4 text-reset d-flex align-items-center gap-2" to="/">
                    <img src={logo} alt="Share & Copy" width="32" height="32" />
                    <span className="d-inline">Share & Copy</span>
                </Link>

                <div className="d-flex gap-2 align-items-center">
                    {token ? (
                        <>
                            {roomId && (
                                <Link to={`/room/${roomId}`} className="btn btn-sm btn-outline-primary rounded-pill px-3 d-none d-sm-inline">
                                    My Room
                                </Link>
                            )}
                            <button
                                onClick={handleLogout}
                                className="btn btn-outline-danger rounded-pill px-3 btn-sm"
                            >
                                <span className="d-none d-sm-inline">Logout</span>
                                <i className="bi bi-box-arrow-right d-sm-none"></i>
                            </button>
                            {user?.isAdmin && (
                                <Link to="/admin" className="btn btn-sm btn-outline-warning rounded-pill px-3 d-none d-sm-inline">
                                    Admin
                                </Link>
                            )}
                        </>
                    ) : (
                        <>
                            <Link to="/login" className="btn btn-outline-secondary rounded-pill px-3 btn-sm">Login</Link>
                            <Link to="/register" className={`btn btn-primary rounded-pill px-3 fw-bold btn-sm ${styles.btnGradientPrimary}`}>
                                <span className="d-none d-sm-inline">Register</span>
                                <span className="d-sm-none">Register</span>
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
