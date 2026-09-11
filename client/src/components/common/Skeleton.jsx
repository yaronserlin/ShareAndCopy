/**
 * Placeholder loading block used to indicate content is being fetched.
 */

import React from 'react';
import './Skeleton.css';

/**
 * @param {Object} props
 * @param {string|number} [props.width] - CSS width of the skeleton block.
 * @param {string|number} [props.height] - CSS height of the skeleton block.
 * @param {'rect'|'circle'} [props.variant='rect'] - Shape of the skeleton block.
 * @param {string} [props.className=''] - Extra class names.
 * @returns {JSX.Element} The skeleton placeholder element.
 */
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
