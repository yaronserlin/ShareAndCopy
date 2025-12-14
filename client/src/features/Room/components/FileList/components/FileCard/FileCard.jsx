import React, { memo } from 'react';
import GlassCard from '../../../../../../components/common/GlassCard';
import styles from './FileCard.module.css';

const FileCard = ({ file, isOwner, onDownload, onDelete, onRenameClick }) => {
    const displayName = file.filename;

    return (
        <GlassCard className={`${styles.card} p-3 h-100`}>
            <div className="d-flex justify-content-between align-items-start mb-3">
                <div className={`p-2 rounded ${styles.iconBg}`}>
                    <i className="bi bi-file-earmark-text fs-5"></i>
                </div>
                {isOwner && (
                    <span className={`badge ${file.isPublic ? 'bg-success bg-opacity-25 text-success' : 'bg-secondary bg-opacity-25 text-secondary'} ${styles.publicBadge}`}>
                        {file.isPublic ? 'Public' : 'Private'}
                    </span>
                )}
            </div>

            <div className="flex-grow-1 mb-3">
                <h3 className={`h6 text-truncate mb-1 ${styles.fileName}`} title={displayName}>
                    {displayName}
                </h3>
                <p className={`text-secondary small mb-0 ${styles.metaText}`}>
                    {new Date(file.createdAt).toLocaleDateString()}
                </p>
                <p className={`text-secondary small ${styles.metaText}`}>
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
            </div>

            <div className="d-flex gap-2 w-100 mt-auto pt-2 border-top border-secondary border-opacity-10">
                <button
                    onClick={() => onDownload(file._id, displayName)}
                    className={`btn btn-sm flex-grow-1 btn-outline-primary bg-primary bg-opacity-10 text-primary fw-semibold ${styles.actionBtn}`}
                >
                    <i className="bi bi-download me-1"></i> Download
                </button>
                {isOwner && (
                    <>
                        <button
                            onClick={() => onDelete(file._id)}
                            className={`btn btn-sm btn-outline-danger text-danger ${styles.actionBtn} ${styles.actionBtnDanger}`}
                            title="Delete"
                        >
                            <i className="bi bi-trash"></i>
                        </button>
                        <button
                            onClick={() => onRenameClick(file)}
                            className={`btn btn-sm btn-outline-warning text-warning ${styles.actionBtn} ${styles.actionBtnWarning}`}
                            title="Rename"
                        >
                            <i className="bi bi-pencil"></i>
                        </button>
                    </>
                )}
            </div>
        </GlassCard>
    );
};

export default memo(FileCard);
