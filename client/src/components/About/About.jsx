/**
 * About page describing how Share & Copy's device-to-device transfers work.
 */

import React from 'react';
import GlassCard from '../common/GlassCard';
import GradientButton from '../common/GradientButton';
import styles from './About.module.css';

/**
 * Renders the "About" page: a static overview of the app's privacy model,
 * device pairing, and direct peer-to-peer file transfer features.
 *
 * @returns {JSX.Element} The About page content.
 */
const About = () => {
    return (
        <div className={`container pb-5 pt-5 mt-5 d-flex flex-column flex-grow-1 ${styles.aboutContainer}`}>

            <div className="row justify-content-center">
                <div className="col-lg-8">
                    <div className="text-center mb-5">
                        <h1 className={`display-4 fw-bold mb-3 ${styles.aboutTitle}`}>
                            About Share & Copy
                        </h1>
                        <p className="lead text-secondary">
                            Direct, private file transfers between your own devices.
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
                                    Files travel directly between your devices over a peer-to-peer connection. They're never uploaded to or stored on our servers.
                                </p>
                            </GlassCard>
                        </div>
                        <div className="col-md-6">
                            <GlassCard className="h-100">
                                <div className="d-flex align-items-center mb-3">
                                    <i className="bi bi-qr-code-scan text-info fs-3 me-3"></i>
                                    <h3 className="h5 fw-bold mb-0 text-body">Device Pairing</h3>
                                </div>
                                <p className="text-secondary mb-0">
                                    Add a new device to your account in seconds by scanning a QR code or entering a one-time pairing code.
                                </p>
                            </GlassCard>
                        </div>
                        <div className="col-md-6">
                            <GlassCard className="h-100">
                                <div className="d-flex align-items-center mb-3">
                                    <i className="bi bi-laptop text-success fs-3 me-3"></i>
                                    <h3 className="h5 fw-bold mb-0 text-body">Your Devices, Online</h3>
                                </div>
                                <p className="text-secondary mb-0">
                                    See every device signed in to your account the moment it comes online, ready to receive files.
                                </p>
                            </GlassCard>
                        </div>
                        <div className="col-md-6">
                            <GlassCard className="h-100">
                                <div className="d-flex align-items-center mb-3">
                                    <i className="bi bi-send-fill text-warning fs-3 me-3"></i>
                                    <h3 className="h5 fw-bold mb-0 text-body">Direct Transfers</h3>
                                </div>
                                <p className="text-secondary mb-0">
                                    Pick a file and send it straight to another device. Potentially unsafe file types are blocked automatically.
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
