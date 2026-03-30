/**
 * Preview: client/src/components/Home/Home.jsx
 * Description: Frontend application module.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import GradientButton from '../common/GradientButton';
import styles from './Home.module.css';


const Home = () => {
    const { token, roomId } = useAuth();

    return (
        <div className="flex-grow-1 position-relative overflow-hidden d-flex flex-column">


            <main className="flex-grow-1 d-flex align-items-center justify-content-center text-center position-relative z-1">
                <div className="container">
                    <div className="row justify-content-center">
                        <div className="col-lg-8">
                            {token ? (
                                <>
                                    <h1 className="display-3 fw-bold mb-4 lh-sm">
                                        Welcome Back!
                                    </h1>
                                    <p className={`lead text-secondary mb-5 mx-auto ${styles.homeLeadText}`}>
                                        Your private room is ready and waiting.
                                    </p>
                                    <div className="d-flex justify-content-center gap-3">
                                        <GradientButton to="/dashboard">
                                            Go to Dashboard
                                        </GradientButton>

                                        <Link to="/about" className={`btn btn-lg btn-light border rounded-pill px-4 py-3 text-dark shadow-sm ${styles.btnHoverEffect}`}>
                                            About
                                        </Link>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <h1 className="display-3 fw-bold mb-4 lh-sm">
                                        Share Files <span className={styles.homeTitleGradient}>Instantly & Securely</span>
                                    </h1>
                                    <p className={`lead text-secondary mb-5 mx-auto ${styles.homeLeadText}`}>
                                        Create your private room, upload files, and share them with a simple link. Secure, fast, and hassle-free file sharing for everyone.
                                    </p>
                                    <div className="d-flex flex-column flex-sm-row justify-content-center gap-3">
                                        <GradientButton to="/register">
                                            Create Your Room
                                        </GradientButton>
                                        <Link to="/about" className={`btn btn-lg btn-light border rounded-pill px-5 py-3 text-dark shadow-sm ${styles.btnHoverEffect}`}>
                                            About
                                        </Link>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Home;
