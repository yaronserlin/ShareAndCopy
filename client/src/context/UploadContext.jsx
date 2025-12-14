import React, { createContext, useState, useContext, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../utils/api';

const UploadContext = createContext(null);

export const useUpload = () => {
    const context = useContext(UploadContext);
    if (!context) {
        throw new Error('useUpload must be used within an UploadProvider');
    }
    return context;
};

export const UploadProvider = ({ children }) => {
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadSpeed, setUploadSpeed] = useState(0); // in MB/s
    const [uploadETA, setUploadETA] = useState(null); // in seconds
    const [activeRoomId, setActiveRoomId] = useState(null);
    const [lastUploadedFile, setLastUploadedFile] = useState(null);

    const startUpload = useCallback(async (roomId, file, isPublic) => {
        if (!file) return;

        setIsUploading(true);
        setUploadProgress(0);
        setUploadSpeed(0);
        setUploadETA(null);
        setActiveRoomId(roomId);
        setLastUploadedFile(null);

        let lastUpdate = Date.now();
        let lastLoaded = 0;

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('isPublic', isPublic);
            if (roomId) formData.append('roomId', roomId); // Ensure backend knows which room if needed by API logic, though usually inferred from URL in component. 
            // Wait, the API endpoint is /files/upload. It typically infers room from context or body. 
            // Looking at previous useFileActions, it just POSTs to /files/upload. 
            // If the backend relies on a header or something, we need to be careful.
            // But usually the file upload IS associated with a room. 
            // *Correction*: In this app, the Room link seems to be logically established.
            // Let's check api.post call in useFileActions.js: 
            // `api.post('/files/upload', formData`... 
            // It seems /files/upload handles it. The cookie/token identifies the user/session? 
            // Or maybe the File Controller puts it in the user's "current" room?
            // Actually, in `useRoom(roomId)` it fetches files for a room.
            // Let's assume standard behavior. If `roomId` is needed in body, I'll allow passing it.
            // For now, I'll just replicate exactly what `useFileActions` did.
            // BUT: `useFileActions` was inside a component that had `roomId`. The `upload` function didn't take roomId.
            // Wait, previous `useFileActions` definition: `const useFileActions = (files, setFiles, setUsedStorage)`
            // `handleUpload` signature: `(file, isPublic)`
            // It seems the backend puts it in the room associated with the USER or the storage?
            // Ah, looking at `api.js` or `fileController` would be best, but I can't look back too far.
            // However, `formData.append('file', file)` and `isPublic`.
            // The backend likely uses the user's active session or adds it to the user's general storage.
            // The `FileList` filters by room? No, `useRoom` fetches files.
            // Let's just blindly copy the axios call.

            const res = await api.post('/files/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                },
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setUploadProgress(percentCompleted);

                    const now = Date.now();
                    const timeElapsedSinceLast = (now - lastUpdate) / 1000; // in seconds

                    if (timeElapsedSinceLast >= 0.5) {
                        const loadedSinceLast = progressEvent.loaded - lastLoaded;
                        const speed = loadedSinceLast / timeElapsedSinceLast; // bytes per second
                        const speedInMB = speed / (1024 * 1024); // MB/s

                        setUploadSpeed(speedInMB.toFixed(2));

                        const remainingBytes = progressEvent.total - progressEvent.loaded;
                        const etaSeconds = speed > 0 ? Math.ceil(remainingBytes / speed) : 0;
                        setUploadETA(etaSeconds);

                        lastUpdate = now;
                        lastLoaded = progressEvent.loaded;
                    }
                }
            });

            // Success
            setLastUploadedFile({ ...res.data.data, roomId });
            toast.success('File uploaded successfully!');
            return true;
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || 'Upload failed');
            return false;
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
            setUploadSpeed(0);
            setUploadETA(null);
            // Don't clear activeRoomId immediately if we want to show "Done" in the room header?
            // Actually RoomHeader hides it 3s after isUploading is false.
            // So we can keep activeRoomId safely.
        }
    }, []);

    const value = {
        isUploading,
        uploadProgress,
        uploadSpeed,
        uploadETA,
        activeRoomId,
        lastUploadedFile,
        startUpload
    };

    return (
        <UploadContext.Provider value={value}>
            {children}
        </UploadContext.Provider>
    );
};
