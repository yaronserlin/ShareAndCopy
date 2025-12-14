import React, { useEffect, useState } from 'react';
import '../styles/RoomView.css'; // Reusing RoomView styles for consistency or general styles

const UploadProgressWidget = ({ progress, isUploading, uploadSpeed, uploadETA }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (isUploading) {
            setIsVisible(true);
        } else {
            const timer = setTimeout(() => setIsVisible(false), 3000); // Increased to 3s to let user see "Done"
            return () => clearTimeout(timer);
        }
    }, [isUploading]);

    if (!isVisible) return null;

    return (
        <div
            className="position-fixed bottom-0 end-0 m-4 p-4 shadow-lg border border-light"
            style={{
                zIndex: 1050,
                width: '320px',
                maxWidth: '90vw',
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(10px)',
                borderRadius: '16px',
                animation: 'slideUp 0.3s ease-out'
            }}
        >
            <div className="d-flex align-items-center justify-content-between mb-3">
                <div className="d-flex align-items-center gap-2">
                    <div className={`rounded-circle p-2 d-flex align-items-center justify-content-center ${isUploading ? 'bg-primary bg-opacity-10 text-primary' : 'bg-success bg-opacity-10 text-success'}`}>
                        <i className={`bi ${isUploading ? 'bi-cloud-arrow-up-fill' : 'bi-check-lg'} fs-5`}></i>
                    </div>
                    <div>
                        <h6 className="mb-0 fw-bold">{isUploading ? 'Uploading...' : 'Complete'}</h6>
                        <small className="text-secondary opacity-75" style={{ fontSize: '0.75rem' }}>
                            {isUploading ? 'Please wait' : 'File uploaded'}
                        </small>
                    </div>
                </div>
                <span className={`badge rounded-pill ${isUploading ? 'bg-primary' : 'bg-success'}`}>
                    {progress}%
                </span>
            </div>

            <div className="progress bg-secondary bg-opacity-10 mb-3" style={{ height: '6px', borderRadius: '4px' }}>
                <div
                    className={`progress-bar ${isUploading ? 'progress-bar-striped progress-bar-animated' : 'bg-success'}`}
                    role="progressbar"
                    style={{ width: `${progress}%` }}
                    aria-valuenow={progress}
                    aria-valuemin="0"
                    aria-valuemax="100"
                ></div>
            </div>

            {isUploading && (
                <div className="d-flex justify-content-between align-items-center pt-2 border-top border-secondary border-opacity-10">
                    <div className="d-flex flex-column">
                        <small className="text-secondary text-uppercase fw-bold" style={{ fontSize: '0.65rem', letterSpacing: '0.5px' }}>Speed</small>
                        <span className="fw-bold text-dark fs-6 font-monospace">{uploadSpeed || 0} MB/s</span>
                    </div>

                    <div className="vr opacity-25"></div>

                    <div className="d-flex flex-column text-end">
                        <small className="text-secondary text-uppercase fw-bold" style={{ fontSize: '0.65rem', letterSpacing: '0.5px' }}>Est. Time</small>
                        <span className="fw-bold text-dark fs-6 font-monospace">
                            {uploadETA !== null ? (uploadETA > 60 ? `${Math.ceil(uploadETA / 60)}m` : `${uploadETA}s`) : '--'}
                        </span>
                    </div>
                </div>
            )}

            {!isUploading && (
                <div className="mt-2 text-center text-success d-flex align-items-center justify-content-center gap-2 animate-pulse">
                    <i className="bi bi-check-circle-fill"></i>
                    <small className="fw-bold">Upload Successful!</small>
                </div>
            )}
        </div>
    );
};

export default UploadProgressWidget;
