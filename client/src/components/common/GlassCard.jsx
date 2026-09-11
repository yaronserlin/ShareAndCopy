/**
 * Reusable frosted-glass panel wrapper used throughout the app for card
 * style content sections.
 */

import React from 'react';

/**
 * @param {Object} props
 * @param {React.ReactNode} props.children - Content rendered inside the panel.
 * @param {string} [props.className=''] - Extra class names.
 * @param {Object} [props.style={}] - Inline styles merged onto the panel.
 * @returns {JSX.Element} The glass-panel wrapper.
 */
const GlassCard = ({ children, className = '', style = {} }) => {
    return (
        <div className={`glass-panel p-4 rounded-4 ${className}`} style={style}>
            {children}
        </div>
    );
};

export default GlassCard;
