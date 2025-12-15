import React from 'react';

const RateLimitError = () => {
    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999999,
            color: 'white',
            flexDirection: 'column',
            textAlign: 'center',
            padding: '2rem'
        }}>
            <h1 style={{ marginBottom: '1rem', fontSize: '2.5rem' }}>Too Many Requests</h1>
            <p style={{ marginBottom: '2rem', fontSize: '1.2rem', maxWidth: '600px' }}>
                You have made too many requests in a short period. Please wait a moment and try again.
            </p>
            <button
                onClick={() => window.location.reload()}
                style={{
                    padding: '10px 20px',
                    fontSize: '1rem',
                    cursor: 'pointer',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    transition: 'background-color 0.2s'
                }}
            >
                Reload Page
            </button>
        </div>
    );
};

export default RateLimitError;
