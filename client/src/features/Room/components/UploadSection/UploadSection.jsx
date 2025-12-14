import React from 'react';
import GlassCard from '../../../../components/common/GlassCard';
import { useUploadSection } from './useUploadSection';
import styles from './UploadSection.module.css';

const UploadSection = ({ onUpload, isUploading, isLoading }) => {
    const {
        selectedFile,
        isPublic,
        setIsPublic,
        dragActive,
        handleDrag,
        handleDrop,
        handleChange,
        handleSubmit
    } = useUploadSection(onUpload);

    return (
        <GlassCard>
            <h3 className="h5 fw-bold mb-4 text-primary d-flex align-items-center gap-2">
                <i className="bi bi-cloud-upload-fill"></i> Upload Data
            </h3>

            <form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
                <label
                    className={`${styles.dropzone} rounded-3 ${dragActive ? styles.dragActive : ''}`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                >
                    {selectedFile ? (
                        <div className="text-center p-2 fade-in">
                            <div className="mb-3 p-3 rounded-circle bg-primary bg-opacity-10 text-primary d-inline-block">
                                <i className="bi bi-file-earmark-check fs-1"></i>
                            </div>
                            <h5 className="text-secondary fw-bold text-break mb-1">{selectedFile.name}</h5>
                            <p className="text-secondary mb-0">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                            <span className="badge bg-success mt-2">Ready to upload</span>
                        </div>
                    ) : (
                        <div className="text-center">
                            <div className="mb-3 p-3 rounded-circle bg-secondary bg-opacity-10 text-secondary d-inline-block">
                                <i className="bi bi-cloud-arrow-up fs-1"></i>
                            </div>
                            <h5 className="mb-2 text-secondary fw-bold">Drag & Drop files here</h5>
                            <p className="text-secondary opacity-75 small mb-0">or click to browse</p>
                        </div>
                    )}
                    <input
                        type="file"
                        className="d-none"
                        onChange={handleChange}
                    />
                </label>

                <div className="d-flex flex-column gap-2 p-3 bg-body-tertiary rounded-3 border border-secondary border-opacity-10">
                    <label className="text-secondary small fw-bold mb-1">File Visibility</label>
                    <div className="d-flex gap-3">
                        <div className="form-check">
                            <input
                                className={`form-check-input ${styles.radioInput}`}
                                type="radio"
                                name="visibility"
                                id="visibilityPrivate"
                                checked={!isPublic}
                                onChange={() => setIsPublic(false)}
                            />
                            <label className={`form-check-label small ${styles.cursorPointer}`} htmlFor="visibilityPrivate">
                                Private <span className="text-secondary opacity-75">(Only You)</span>
                            </label>
                        </div>
                        <div className="form-check">
                            <input
                                className={`form-check-input ${styles.radioInput}`}
                                type="radio"
                                name="visibility"
                                id="visibilityPublic"
                                checked={isPublic}
                                onChange={() => setIsPublic(true)}
                            />
                            <label className={`form-check-label small ${styles.cursorPointer}`} htmlFor="visibilityPublic">
                                Public <span className="text-secondary opacity-75">(Anyone with link)</span>
                            </label>
                        </div>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={isLoading || isUploading || !selectedFile}
                    className={`btn w-100 py-3 rounded-3 shadow-sm mt-2 fs-6 mb-2 ${styles.uploadBtn}`}
                >
                    {isUploading ? (
                        <>
                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                            Uploading...
                        </>
                    ) : (
                        <>
                            <i className="bi bi-cloud-arrow-up-fill me-2"></i> Upload File
                        </>
                    )}
                </button>
            </form>
        </GlassCard>
    );
};

export default UploadSection;
