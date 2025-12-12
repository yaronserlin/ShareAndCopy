import React from 'react';

const GlassCard = ({ children, className = '', style = {} }) => {
    return (
        <div className={`glass-panel p-4 rounded-4 ${className}`} style={style}>
            {children}
        </div>
    );
};

export default GlassCard;
