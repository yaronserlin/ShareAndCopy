import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import NotFound from '../../components/NotFound';
import BackgroundDecorations from '../../components/common/BackgroundDecorations';
import RoomHeader from './components/RoomHeader';
import FileList from './components/FileList';
import UploadSection from './components/UploadSection';
import useRoom from './hooks/useRoom';
import useFileActions from './hooks/useFileActions';
import Modal from '../../components/common/Modal';

import RoomSkeleton from './components/RoomSkeleton';
import './styles/RoomView.css';
import toast from 'react-hot-toast';

import UploadProgressWidget from './components/UploadProgressWidget';

import { APP_CONSTANTS } from '../../constants';

const RoomView = () => {
    const { roomId } = useParams();
    const [showUpload, setShowUpload] = useState(false);

    const { MAX_STORAGE_BYTES: MAX_STORAGE } = APP_CONSTANTS;


    const {
        files,
        setFiles,
        isOwner,
        usedStorage,
        setUsedStorage,
        isLoading,
        roomNotFound,
        ownerName
    } = useRoom(roomId);

    const {
        isUploading,
        uploadProgress,
        handleUpload: uploadFile,
        handleDownload,
        handleRename,
        handleDelete
    } = useFileActions(files, setFiles, setUsedStorage);

    const allowUpload = (fileSize = 0) => {
        if (usedStorage > MAX_STORAGE) {
            return false;
        }
        if ((usedStorage + fileSize) > MAX_STORAGE) {
            return false;
        }
        return isOwner;
    }

    const handleUpload = (file, isPublic) => {

        if (!allowUpload(file.size)) {
            toast.error(`Storage limit exceeded ${MAX_STORAGE / 1024 / 1024}MB`)
            return;
        }

        uploadFile(file, isPublic);
        setShowUpload(false);
    };

    if (roomNotFound) {
        return <NotFound title="Room Not Found" message="The room you are looking for doesn't exist or has been deleted." />;
    }

    if (isLoading) {
        return <RoomSkeleton />;
    }

    return (
        <div className="min-h-100 p-4 pb-5 position-relative overflow-hidden">
            <BackgroundDecorations />

            <div className="container position-relative z-1 room-container">
                <RoomHeader
                    roomId={roomId}
                    usedStorage={usedStorage}
                    maxStorage={MAX_STORAGE}
                    ownerName={ownerName}
                    isOwner={isOwner}
                />

                {/* Toolbar / Actions */}
                <div className="d-flex align-items-center justify-content-between mb-4">
                    <h2 className="h5 fw-bold mb-0 d-flex align-items-center gap-2">
                        <span className="badge bg-secondary rounded-circle d-flex align-items-center justify-content-center" style={{ width: '30px', height: '30px' }}>{files.length}</span>
                        Files Available
                    </h2>

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

                {/* File List (Full Width) */}
                <FileList
                    files={files}
                    isOwner={isOwner}
                    onDownload={handleDownload}
                    onRename={handleRename}
                    onDelete={handleDelete}
                />

                {/* Upload Modal via Portal */}
                {showUpload && isOwner && allowUpload() && (
                    <Modal onClose={() => setShowUpload(false)}>

                        <UploadSection
                            onUpload={handleUpload}
                            isUploading={isUploading}
                            isLoading={isLoading}
                        />
                    </Modal>
                )}

                <UploadProgressWidget
                    progress={uploadProgress}
                    isUploading={isUploading}
                />
            </div>
        </div>
    );
};

export default RoomView;
