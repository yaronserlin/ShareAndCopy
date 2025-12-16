import React from 'react';
import NotFound from '../../components/NotFound';
import BackgroundDecorations from '../../components/common/BackgroundDecorations';
import RoomHeader from './components/RoomHeader/RoomHeader';
import FileList from './components/FileList/FileList';
import UploadSection from './components/UploadSection/UploadSection';
import RoomSkeleton from './components/RoomSkeleton';
import Modal from '../../components/common/Modal/Modal';
import useRoomView from './hooks/useRoomView';
import styles from './RoomView.module.css';

/**
 * Room View Component
 * Main container for the Room feature.
 * @returns {JSX.Element} Rendered component
 */
const RoomView = () => {
    const {
        roomId,
        files,
        isOwner,
        usedStorage,
        MAX_STORAGE,
        ownerName,
        isLoading,
        roomNotFound,
        showUpload,
        setShowUpload,
        allowUpload,
        handleUpload,
        handleDownload,
        handleDownloadAll,
        handleRename,
        handleDelete,
        isUploading,
        uploadProgress,
        uploadSpeed,
        uploadETA
    } = useRoomView();

    if (roomNotFound) {
        return <NotFound title="Room Not Found" message="The room you are looking for doesn't exist or has been deleted." />;
    }

    if (isLoading) {
        return <RoomSkeleton />;
    }

    return (
        <div className="flex-grow-1 p-4 pb-5 position-relative overflow-hidden">
            <BackgroundDecorations />

            <div className={`container position-relative z-1 ${styles.roomContainer}`}>
                <RoomHeader
                    roomId={roomId}
                    usedStorage={usedStorage}
                    maxStorage={MAX_STORAGE}
                    ownerName={ownerName}
                    isOwner={isOwner}
                    isUploading={isUploading}
                    uploadProgress={uploadProgress}
                    uploadSpeed={uploadSpeed}
                    uploadETA={uploadETA}
                />

                {/* Toolbar / Actions */}
                <div className="d-flex align-items-center justify-content-between mb-4">
                    <div className="d-flex align-items-center gap-3">
                        <h2 className="h5 fw-bold mb-0 d-flex align-items-center gap-2">
                            <span className="badge bg-secondary rounded-circle d-flex align-items-center justify-content-center" style={{ width: '30px', height: '30px' }}>{files.length}</span>
                            Files Available
                        </h2>
                        {files.length > 0 && (
                            <button
                                className="btn btn-outline-primary btn-sm rounded-pill px-3 shadow-sm fw-bold d-flex align-items-center gap-2"
                                onClick={handleDownloadAll}
                            >
                                <i className="bi bi-download"></i>
                                <span className="d-none d-sm-inline">Download All</span>
                            </button>
                        )}
                    </div>

                    {isOwner && (
                        <div>
                            <button
                                className="btn btn-primary rounded-pill px-4 shadow-sm fw-bold d-flex align-items-center gap-2"
                                onClick={() => setShowUpload(true)}
                                disabled={!allowUpload()}
                            >
                                <i className="bi bi-cloud-upload-fill"></i>
                                <span className="d-none d-sm-inline">Upload File</span>
                            </button>
                            <span hidden={allowUpload()} className='text-danger sm-text'>You used all the space</span>
                        </div>
                    )}
                </div>

                <FileList
                    files={files}
                    isOwner={isOwner}
                    onDownload={handleDownload}
                    onRename={handleRename}
                    onDelete={handleDelete}
                />

                {/* Upload Modal */}
                {showUpload && isOwner && allowUpload() && (
                    <Modal onClose={() => setShowUpload(false)}>
                        <UploadSection
                            onUpload={handleUpload}
                            isUploading={isUploading}
                            isLoading={isLoading}
                        />
                    </Modal>
                )}
            </div>
        </div>
    );
};

export default RoomView;
