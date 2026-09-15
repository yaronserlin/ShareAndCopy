/**
 * Per-device notification settings: a master switch that subscribes this
 * browser to Web Push, and a switch per category once it is on.
 *
 * The component is deliberately explicit about why notifications might
 * be unavailable - unsupported browser, not installed to the home screen
 * on iOS, permission blocked, or not configured on the server - because
 * "nothing happens when I tap it" is the worst possible outcome here.
 */

import React, { useState } from 'react';
import toast from 'react-hot-toast';
import PropTypes from 'prop-types';
import { useAuth } from '../context/AuthContext';
import { useNotifications, NOTIFICATION_CATEGORIES } from '../hooks/useNotifications';

/**
 * Renders the notification settings panel for the current device.
 *
 * @param {Object} props
 * @param {boolean} [props.defaultOpen] - Whether the panel starts expanded.
 * @returns {JSX.Element|null} The panel, or nothing while the server's capability is still unknown.
 */
const NotificationSettings = ({ defaultOpen = false }) => {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(defaultOpen);
    const {
        supported,
        requiresInstall,
        serverEnabled,
        permission,
        isSubscribed,
        preferences,
        isBusy,
        isLoading,
        error,
        enable,
        disable,
        setCategory,
        sendTest
    } = useNotifications(user);

    if (isLoading || serverEnabled === null) {
        return null;
    }

    /** Flips the master switch, reporting the outcome either way. */
    const handleToggle = async () => {
        if (isSubscribed) {
            const ok = await disable();
            if (ok) toast.success('Notifications turned off for this device.');
            return;
        }

        const ok = await enable();
        if (ok) toast.success('Notifications are on for this device.');
    };

    /** Sends a test notification and says what happened. */
    const handleTest = async () => {
        const delivered = await sendTest();
        if (delivered > 0) {
            toast.success(`Test sent to ${delivered} device${delivered === 1 ? '' : 's'}.`);
        } else {
            toast('No device is currently accepting this notification.', { icon: 'ℹ️' });
        }
    };

    /** The reason notifications can't be enabled here, if there is one. */
    const blockedReason = (() => {
        if (!serverEnabled) return 'Notifications are not configured on this server yet.';
        if (requiresInstall) return 'On iPhone and iPad, add Share & Copy to your home screen first - notifications are only available to the installed app.';
        if (!supported) return 'This browser does not support notifications.';
        if (permission === 'denied') return 'Notifications are blocked for this app. Allow them in your browser or system settings, then try again.';
        return null;
    })();

    return (
        <section className="mt-5">
            <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                <div>
                    <h2 className="h4 fw-bold mb-1">
                        <i className="bi bi-bell me-2"></i>
                        Notifications
                    </h2>
                    <p className="text-muted small mb-0">
                        Settings apply to this device only.
                    </p>
                </div>

                <div className="d-flex align-items-center gap-2">
                    {isSubscribed && (
                        <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm rounded-pill"
                            onClick={handleTest}
                            disabled={isBusy}
                        >
                            Send test
                        </button>
                    )}

                    <div className="form-check form-switch m-0">
                        <input
                            className="form-check-input"
                            type="checkbox"
                            role="switch"
                            id="notifications-master-switch"
                            checked={isSubscribed}
                            onChange={handleToggle}
                            disabled={isBusy || Boolean(blockedReason)}
                        />
                        <label className="form-check-label visually-hidden" htmlFor="notifications-master-switch">
                            Enable notifications on this device
                        </label>
                    </div>
                </div>
            </div>

            {blockedReason && (
                <div className="alert alert-secondary mt-3 mb-0 small">
                    <i className="bi bi-info-circle me-2"></i>
                    {blockedReason}
                </div>
            )}

            {error && (
                <div className="alert alert-warning mt-3 mb-0 small" role="alert">
                    {error}
                </div>
            )}

            {isSubscribed && (
                <div className="mt-3">
                    <button
                        type="button"
                        className="btn btn-link btn-sm px-0 text-decoration-none"
                        onClick={() => setIsOpen((open) => !open)}
                        aria-expanded={isOpen}
                    >
                        <i className={`bi bi-chevron-${isOpen ? 'up' : 'down'} me-1`}></i>
                        What to notify me about
                    </button>

                    {isOpen && (
                        <div className="list-group shadow-sm mt-2">
                            {NOTIFICATION_CATEGORIES.map(({ key, label, description }) => (
                                <div
                                    key={key}
                                    className="list-group-item d-flex justify-content-between align-items-center gap-3 py-3"
                                >
                                    <div>
                                        <div className="fw-semibold">{label}</div>
                                        <div className="text-muted small">{description}</div>
                                    </div>
                                    <div className="form-check form-switch m-0">
                                        <input
                                            className="form-check-input"
                                            type="checkbox"
                                            role="switch"
                                            id={`notification-category-${key}`}
                                            checked={Boolean(preferences[key])}
                                            onChange={(event) => setCategory(key, event.target.checked)}
                                        />
                                        <label className="form-check-label visually-hidden" htmlFor={`notification-category-${key}`}>
                                            {label}
                                        </label>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </section>
    );
};

NotificationSettings.propTypes = {
    defaultOpen: PropTypes.bool
};

export default NotificationSettings;
