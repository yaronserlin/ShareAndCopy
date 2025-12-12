import React from 'react';

const BackgroundDecorations = () => {
    return (
        <>
            <div className="position-fixed" style={{ top: '-10%', left: '-10%', width: '100vw', height: '100vw', backgroundColor: '#6366f1', borderRadius: '50%', filter: 'blur(120px)', opacity: 0.15, zIndex: 0 }}></div>
            <div className="position-fixed" style={{ bottom: '-10%', right: '-10%', width: '100vw', height: '100vw', backgroundColor: '#ec4899', borderRadius: '50%', filter: 'blur(120px)', opacity: 0.15, zIndex: 0 }}></div>
        </>
    );
};

export default BackgroundDecorations;
