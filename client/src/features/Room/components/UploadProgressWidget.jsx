import React, { useEffect, useState } from 'react';
import '../styles/RoomView.css'; // Reusing RoomView styles for consistency or general styles

const UploadProgressWidget = ({ progress, isUploading }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (isUploading) {
            setIsVisible(true);
        } else {
            // Delay hiding to show 100% completion briefly
            const timer = setTimeout(() => setIsVisible(false), 2000);
            return () => clearTimeout(timer);
        }
    }, [isUploading]);

    if (!isVisible) return null;

    return (
        <div className="position-fixed bottom-0 end-0 m-4 p-3 bg-white rounded-3 shadow-lg border border-light" style={{ zIndex: 1050, width: '300px', maxWidth: '90vw' }}>
            <div className="d-flex align-items-center justify-content-between mb-2">
                <h6 className="mb-0 fw-bold text-primary">
                    {isUploading ? 'Uploading File...' : 'Upload Complete'}
                </h6>
                <span className="badge bg-primary rounded-pill">{progress}%</span>
            </div>

            <div className="progress" style={{ height: '8px' }}>
                <div
                    className="progress-bar progress-bar-striped progress-bar-animated"
                    role="progressbar"
                    style={{ width: `${progress}%` }}
                    aria-valuenow={progress}
                    aria-valuemin="0"
                    aria-valuemax="100"
                ></div>
            </div>

            {!isUploading && (
                <div className="mt-2 text-end">
                    <small className="text-success fw-bold"><i className="bi bi-check-circle-fill me-1"></i> Done</small>
                </div>
            )}

            {isUploading && progress === 100 && (
                <div className="mt-2 text-end">
                    <small className="text-muted fst-italic">Processing...</small>
                </div>
            )}
        </div>
    );
};

export default UploadProgressWidget;
