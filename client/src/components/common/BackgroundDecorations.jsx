/**
 * Purely decorative, fixed-position blurred color blobs used as an
 * ambient background layer behind page content.
 */

import React from 'react';

/**
 * Renders two fixed, non-interactive gradient blobs behind page content.
 *
 * @returns {JSX.Element} The decorative background elements.
 */
const BackgroundDecorations = () => {
    return (
        <>
            <div aria-hidden="true" className="position-fixed" style={{ top: '-10%', left: '-10%', width: '50vmax', height: '50vmax', backgroundColor: '#6366f1', borderRadius: '50%', filter: 'blur(120px)', opacity: 0.15, zIndex: 0 }}></div>
            <div aria-hidden="true" className="position-fixed" style={{ bottom: '-10%', right: '-10%', width: '50vmax', height: '50vmax', backgroundColor: '#ec4899', borderRadius: '50%', filter: 'blur(120px)', opacity: 0.15, zIndex: 0 }}></div>
        </>
    );
};

export default BackgroundDecorations;
