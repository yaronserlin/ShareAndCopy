/**
 * Preview: client/src/components/About/index.jsx
 * Description: Frontend application module.
 */

import React from 'react';
import GlassCard from '../common/GlassCard';
import GradientButton from '../common/GradientButton';
import BackgroundDecorations from '../common/BackgroundDecorations';
import styles from './About.module.css';


const About = () => {
    return (
        <div className={`container pb-5 d-flex flex-column flex-grow-1 ${styles.aboutContainer}`}>
            <BackgroundDecorations />
            <div className="row justify-content-center">
                <div className="col-lg-8">
                    <div className="text-center mb-5">
                        <h1 className={`display-4 fw-bold mb-3 ${styles.aboutTitle}`}>
                            About Share & Copy
                        </h1>
                        <p className="lead text-secondary">
                            Secure, temporary file sharing made simple.
                        </p>
                    </div>

                    <div className="row g-4">
                        <div className="col-md-6">
                            <GlassCard className="h-100">
                                <div className="d-flex align-items-center mb-3">
                                    <i className="bi bi-shield-lock-fill text-primary fs-3 me-3"></i>
                                    <h3 className="h5 fw-bold mb-0 text-body">Secure & Private</h3>
                                </div>
                                <p className="text-secondary mb-0">
                                    Your data is private and only accessible to those with the room link.
                                </p>
                            </GlassCard>
                        </div>
                        <div className="col-md-6">
                            <GlassCard className="h-100">
                                <div className="d-flex align-items-center mb-3">
                                    <i className="bi bi-clock-history text-danger fs-3 me-3"></i>
                                    <h3 className="h5 fw-bold mb-0 text-body">Auto-Deletion</h3>
                                </div>
                                <p className="text-secondary mb-0">
                                    Files are automatically deleted after 24 hours (or your custom setting), ensuring no clutter is left behind.
                                </p>
                            </GlassCard>
                        </div>
                        <div className="col-md-6">
                            <GlassCard className="h-100">
                                <div className="d-flex align-items-center mb-3">
                                    <i className="bi bi-people-fill text-success fs-3 me-3"></i>
                                    <h3 className="h5 fw-bold mb-0 text-body">Room-Based Sharing</h3>
                                </div>
                                <p className="text-secondary mb-0">
                                    Create a dedicated room and share the link. Anyone with the link can view and download files instantly.
                                </p>
                            </GlassCard>
                        </div>
                        <div className="col-md-6">
                            <GlassCard className="h-100">
                                <div className="d-flex align-items-center mb-3">
                                    <i className="bi bi-cloud-arrow-up-fill text-info fs-3 me-3"></i>
                                    <h3 className="h5 fw-bold mb-0 text-body">Easy Upload</h3>
                                </div>
                                <p className="text-secondary mb-0">
                                    Drag and drop files to upload. Support for large files and various formats. Rename files easily.
                                </p>
                            </GlassCard>
                        </div>
                    </div>

                    <div className="text-center mt-5">
                        <GradientButton to="/">
                            Get Started
                        </GradientButton>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default About;
