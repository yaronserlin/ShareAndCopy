import React from 'react';
import PropTypes from 'prop-types';
import RoomTitle from './components/RoomTitle/RoomTitle';
import StorageBar from './components/StorageBar/StorageBar';
import UploadProgress from './components/UploadProgress/UploadProgress';
import QRModal from './components/QRModal/QRModal';
import { useRoomHeader } from '../../hooks/useRoomHeader';
import styles from './RoomHeader.module.css';

/**
 * Room Header Component
 * Displays room information, storage usage, and controls.
 * @param {Object} props - Component props
 * @param {string} props.roomId - The Room ID
 * @param {number} props.usedStorage - Used storage in bytes
 * @param {number} props.maxStorage - Max storage in bytes
 * @param {Object} props.ownerName - Owner object { firstName, lastName }
 * @param {boolean} props.isOwner - Is current user the owner
 * @param {boolean} props.isUploading - Is currently uploading
 * @param {number} props.uploadProgress - Upload progress percentage
 * @param {number} props.uploadSpeed - Upload speed in MB/s
 * @param {number} props.uploadETA - Upload ETA in seconds
 * @returns {JSX.Element} Rendered component
 */
const RoomHeader = ({
    roomId,
    usedStorage,
    maxStorage,
    ownerName,
    isOwner,
    isUploading,
    uploadProgress,
    uploadSpeed,
    uploadETA
}) => {
    const {
        showQRModal,
        setShowQRModal,
        roomUrl,
        showUploadProgress,
        handleCopyUrl
    } = useRoomHeader(roomId, isUploading);

    return (
        <>
            <header className={`${styles.roomHeaderWrapper} d-flex flex-column gap-3 mb-4`}>
                <RoomTitle
                    ownerName={ownerName}
                    roomId={roomId}
                    roomUrl={roomUrl}
                    onCopyUrl={handleCopyUrl}
                    onShowQR={() => setShowQRModal(true)}
                />

                {isOwner && (
                    <StorageBar
                        usedStorage={usedStorage}
                        maxStorage={maxStorage}
                    />
                )}

                {showUploadProgress && (
                    <UploadProgress
                        isUploading={isUploading}
                        uploadProgress={uploadProgress}
                        uploadSpeed={uploadSpeed}
                        uploadETA={uploadETA}
                    />
                )}
            </header>

            <QRModal
                isOpen={showQRModal}
                onClose={() => setShowQRModal(false)}
                roomUrl={roomUrl}
                onCopyUrl={handleCopyUrl}
            />
        </>
    );
};

RoomHeader.propTypes = {
    roomId: PropTypes.string.isRequired,
    usedStorage: PropTypes.number.isRequired,
    maxStorage: PropTypes.number.isRequired,
    ownerName: PropTypes.shape({
        firstName: PropTypes.string,
        lastName: PropTypes.string,
    }),
    isOwner: PropTypes.bool.isRequired,
    isUploading: PropTypes.bool.isRequired,
    uploadProgress: PropTypes.number,
    uploadSpeed: PropTypes.number,
    uploadETA: PropTypes.number,
};

export default RoomHeader;


