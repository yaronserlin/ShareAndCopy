import { useState } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import useRoom from './useRoom';
import useFileActions from './useFileActions';
import { APP_CONSTANTS } from '../../../constants';

/**
 * Custom hook for RoomView logic
 * Aggregates useRoom and useFileActions
 * @returns {Object} Data and handlers for RoomView
 */
const useRoomView = () => {
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
        uploadSpeed,
        uploadETA,
        handleUpload: uploadFile,
        handleDownload,
        handleDownloadAll,
        handleRename,
        handleDelete
    } = useFileActions(roomId, files, setFiles, setUsedStorage);

    const allowUpload = (fileSize = 0) => {
        if (usedStorage > MAX_STORAGE) {
            return false;
        }
        if ((usedStorage + fileSize) > MAX_STORAGE) {
            return false;
        }
        return isOwner;
    };

    const handleUploadWrapper = (file, isPublic) => {
        if (!allowUpload(file.size)) {
            toast.error(`Storage limit exceeded ${MAX_STORAGE / 1024 / 1024}MB`);
            return;
        }

        uploadFile(file, isPublic);
        setShowUpload(false);
    };

    return {
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
        handleUpload: handleUploadWrapper,
        handleDownload,
        handleDownloadAll,
        handleRename,
        handleDelete,
        // Upload stats
        isUploading,
        uploadProgress,
        uploadSpeed,
        uploadETA
    };
};

export default useRoomView;
