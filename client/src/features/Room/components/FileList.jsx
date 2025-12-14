import React, { useState, useEffect } from 'react';
import GlassCard from '../../../components/common/GlassCard';
import Modal from '../../../components/common/Modal';
import '../styles/RoomView.css';


const FileList = ({ files, isOwner, onDownload, onRename, onDelete }) => {
    const [renamingFile, setRenamingFile] = useState(null);
    const [newFileName, setNewFileName] = useState('');
    const [fileExtension, setFileExtension] = useState('');

    useEffect(() => {
        if (renamingFile) {
            const lastDotIndex = renamingFile.filename.lastIndexOf('.');
            if (lastDotIndex !== -1) {
                setNewFileName(renamingFile.filename.substring(0, lastDotIndex));
                setFileExtension(renamingFile.filename.substring(lastDotIndex));
            } else {
                setNewFileName(renamingFile.filename);
                setFileExtension('');
            }
        }
    }, [renamingFile]);

    const handleRenameClick = (file) => {
        setRenamingFile(file);
    };

    const confirmRename = () => {
        const fullNewName = newFileName + fileExtension;
        if (renamingFile && newFileName && fullNewName !== renamingFile.filename) {
            onRename(renamingFile._id, fullNewName);
        }
        setRenamingFile(null);
    };

    if (files.length === 0) {
        return (
            <div className="text-center py-5 text-secondary border border-secondary border-dashed rounded-4 h-100 d-flex flex-column align-items-center justify-content-center">
                <i className="bi bi-folder2-open display-4 mb-3 opacity-50"></i>
                <p className="mb-0 fs-5">No files shared yet.</p>
                <p className="small opacity-75">Upload a file to get started.</p>
            </div>
        );
    }

    return (
        <>
            <div className="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-3">
                {files.map(file => {
                    const displayName = file.filename;

                    return (
                        <div key={file._id} className="col">
                            <GlassCard className="p-3 h-100 file-card d-flex flex-column">
                                <div className="d-flex justify-content-between align-items-start mb-3">
                                    <div className="p-2 rounded file-icon-bg">
                                        <i className="bi bi-file-earmark-text fs-5"></i>
                                    </div>
                                    {isOwner && (
                                        <span className={`badge ${file.isPublic ? 'bg-success bg-opacity-25 text-success' : 'bg-secondary bg-opacity-25 text-secondary'}`} style={{ fontSize: '0.65rem' }}>
                                            {file.isPublic ? 'Public' : 'Private'}
                                        </span>
                                    )}
                                </div>

                                <div className="flex-grow-1 mb-3">
                                    <h3 className="h6 text-truncate mb-1 fw-bold" title={displayName}>
                                        {displayName}
                                    </h3>
                                    <p className="text-secondary small mb-0" style={{ fontSize: '0.75rem' }}>
                                        {new Date(file.createdAt).toLocaleDateString()}
                                    </p>
                                    <p className="text-secondary small" style={{ fontSize: '0.75rem' }}>
                                        {(file.size / 1024 / 1024).toFixed(2)} MB
                                    </p>
                                </div>

                                <div className="d-flex gap-2 w-100 mt-auto pt-2 border-top border-secondary border-opacity-10">
                                    <button
                                        onClick={() => onDownload(file._id, displayName)}
                                        className="btn btn-sm flex-grow-1 btn-outline-primary bg-primary bg-opacity-10 text-primary fw-semibold file-action-btn"
                                    >
                                        <i className="bi bi-download me-1"></i> Download
                                    </button>
                                    {isOwner && (
                                        <>
                                            <button
                                                onClick={() => onDelete(file._id)}
                                                className="btn btn-sm btn-outline-danger text-danger file-action-btn file-action-btn-danger"
                                                title="Delete"
                                            >
                                                <i className="bi bi-trash"></i>
                                            </button>
                                            <button
                                                onClick={() => handleRenameClick(file)}
                                                className="btn btn-sm btn-outline-warning text-warning file-action-btn file-action-btn-warning"
                                                title="Rename"
                                            >
                                                <i className="bi bi-pencil"></i>
                                            </button>
                                        </>
                                    )}
                                </div>
                            </GlassCard>
                        </div>
                    )
                })}
            </div>

            {renamingFile && (
                <Modal onClose={() => setRenamingFile(null)}>
                    <div className="p-2">
                        <h3 className="h5 mb-3 fw-bold">Rename File</h3>
                        <div className="input-group mb-3">
                            <input
                                type="text"
                                className="form-control"
                                value={newFileName}
                                onChange={(e) => setNewFileName(e.target.value)}
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') confirmRename();
                                    if (e.key === 'Escape') setRenamingFile(null);
                                }}
                            />
                            {fileExtension && (
                                <span className="input-group-text text-secondary bg-secondary bg-opacity-10 border-secondary border-opacity-25">
                                    {fileExtension}
                                </span>
                            )}
                        </div>
                        <div className="d-flex justify-content-end gap-2">
                            <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => setRenamingFile(null)}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn btn-primary btn-sm"
                                onClick={confirmRename}
                                disabled={!newFileName.trim() || (newFileName + fileExtension) === renamingFile.filename}
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </>
    );
};

export default FileList;
