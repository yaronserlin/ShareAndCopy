import React from 'react';
import './Skeleton.css';

const Skeleton = ({ width, height, variant = 'rect', className = '' }) => {
    const style = {
        width,
        height,
        borderRadius: variant === 'circle' ? '50%' : '4px',
    };

    return (
        <span
            className={`skeleton-loader ${className}`}
            style={style}
        />
    );
};

export default Skeleton;
