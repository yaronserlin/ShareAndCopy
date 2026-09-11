/**
 * React error boundary that catches rendering errors in its subtree and
 * displays a fallback UI instead of crashing the whole app.
 */

import React from 'react';
import PropTypes from 'prop-types';

/**
 * Catches errors thrown while rendering its children and shows a reload
 * prompt in their place.
 */
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    /**
     * React lifecycle hook: derives error state from a thrown error so the
     * next render shows the fallback UI.
     *
     * @param {Error} error - The error thrown by a descendant component.
     * @returns {{hasError: boolean, error: Error}} Updated state.
     */
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    /**
     * React lifecycle hook: logs errors caught from descendant components.
     *
     * @param {Error} error - The error that was thrown.
     * @param {Object} errorInfo - React-provided component stack info.
     */
    componentDidCatch(error, errorInfo) {
        console.error('Error Boundary caught:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '20px', textAlign: 'center' }}>
                    <h1>Something went wrong</h1>
                    <p>{this.state.error?.message || 'An unexpected error occurred'}</p>
                    <button onClick={() => window.location.reload()}>
                        Reload Page
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

ErrorBoundary.propTypes = {
    children: PropTypes.node.isRequired
};

export default ErrorBoundary;
