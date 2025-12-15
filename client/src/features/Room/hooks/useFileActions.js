import { useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../../../utils/api';
import { useUpload } from '../../../context/UploadContext';


const useFileActions = (roomId, files, setFiles, setUsedStorage) => {
    const {
        isUploading,
        uploadProgress,
        uploadSpeed,
        uploadETA,
        startUpload,
        lastUploadedFile,
        activeRoomId
    } = useUpload();

    // Listen for global upload completion
    useEffect(() => {
        if (lastUploadedFile && lastUploadedFile.roomId === roomId) {
            // Check if file already exists to avoid duplicates (though setFiles usually replaces or appends)
            // If the user came back and useRoom already fetched it, we might duplicate.
            // But useRoom fetches ONCE on mount.
            // If upload finishes AFTER mount, we need to add it.
            // If upload finished BEFORE mount, useRoom got it. lastUploadedFile might still be set from previous action?
            // Context `lastUploadedFile` should probably be cleared or timestamped?
            // Current context implementation: `setLastUploadedFile` on success. It stays there.
            // Additional check: verify if file with same ID exists.

            setFiles(prevFiles => {
                if (prevFiles.some(f => f._id === lastUploadedFile._id)) {
                    return prevFiles;
                }
                return [lastUploadedFile, ...prevFiles];
            });

            // Update storage only if we added it (or we can just blindly add based on file size if not checking dupe for storage? 
            // Better to match file logic)
            setUsedStorage(prev => {
                // We don't have easy access to check if file was in prevFiles inside this setter logic without refs or complex state
                // But generally safe to add if we trust it's new. 
                // However to be safe against double counting if useRoom got it:
                // Let's rely on the fact that if we are processing `lastUploadedFile`, it's a "Just now" event.
                // But `lastUploadedFile` is state. If I mount, `useEffect` runs. 
                // I need to ensure I don't process "stale" lastUploadedFile.
                // Context doesn't clear it.
                // It's tricky.
                // Maybe the SIMPLEST way for "continue even if user go to another page" is:
                // We rely on `isUploading` to show progress.
                // When `isUploading` goes false (done), if we are in the room, we trigger a re-fetch of the room data?
                // Or we just accept that if we are in the room, the `setFiles` from the *original* call might fail if component unmounted.
                // But the `useEffect` on `lastUploadedFile` will allow us to catch it even if we re-mounted.
                // To avoid processing stale events: `lastUploadedFile` could have a timestamp.
                // Or simpler: The user PROBABLY won't upload, nav away, nav back, refresh, etc. so fast.
                // I will add a check: duplicate ID check prevents visual dupe.
                // Storage dupe? `setUsedStorage` might drift.
                // Ideally `useRoom` exposes a `refresh()` method but it doesn't.
                // I'll stick to: Add if ID not present. Add size if ID not present.
                // Note: `setFiles` callback gives access to current files. `setUsedStorage` callback gives current storage.
                // But I can't sync them easily.
                // Actually, I can use `files` dependency in useEffect?
                // No, that triggers too often.
                // Let's iterate `setFiles`:
                return prev; // We will update storage inside setFiles logic?? No separate state.
            });
        }
    }, [lastUploadedFile, roomId, setFiles]);

    // Separate effect for handling storage update to avoid complex state mixing
    useEffect(() => {
        if (lastUploadedFile && lastUploadedFile.roomId === roomId) {
            setFiles(currentFiles => {
                const exists = currentFiles.some(f => f._id === lastUploadedFile._id);
                if (!exists) {
                    setUsedStorage(prev => prev + lastUploadedFile.size); // Update storage
                    return [lastUploadedFile, ...currentFiles];
                }
                return currentFiles;
            });
        }
    }, [lastUploadedFile, roomId, setFiles, setUsedStorage]);


    const handleUpload = async (file, isPublic) => {
        // Delegate to context
        // We pass roomId so context knows where it belongs
        await startUpload(roomId, file, isPublic);
    };

    const handleDownload = async (fileId, filename) => {
        const toastId = toast.loading('Preparing download...');
        try {
            // Step 1: Request Download Token
            const res = await api.get(`/files/${fileId}/download-token`);
            const { token } = res.data.data;

            // Step 2: Construct URL with Token
            const downloadUrl = `${api.defaults.baseURL}/files/download/${fileId}?token=${token}`;

            // Step 3: Trigger Native Browser Download
            // This bypasses client-side buffering (blob) and handles large files efficiently
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.setAttribute('download', filename); // Helper, though server Content-Disposition rules
            document.body.appendChild(link);
            link.click();
            link.remove();

            toast.dismiss(toastId);
            toast.success('Download started');
        } catch (err) {
            console.error('Download failed', err);
            toast.dismiss(toastId);
            toast.error(err.response?.data?.message || 'Download failed');
        }
    };

    const handleDownloadAll = async () => {
        const toastId = toast.loading('Preparing zip archive...');
        try {
            // Step 1: Request Download Token
            const res = await api.get(`/files/download-all-token/${roomId}`);
            const { token } = res.data.data;

            // Step 2: Construct URL with Token
            const downloadUrl = `${api.defaults.baseURL}/files/download-all/${roomId}?token=${token}`;

            // Step 3: Trigger Native Browser Download
            const link = document.createElement('a');
            link.href = downloadUrl;
            // link.setAttribute('download', ...); // Allow server Content-Disposition to name the file
            document.body.appendChild(link);
            link.click();
            link.remove();

            toast.dismiss(toastId);
            toast.success('Download started');
        } catch (err) {
            console.error('Download all failed', err);
            toast.dismiss(toastId);
            // Check if 404 (no files) or other error
            const msg = err.response?.status === 404
                ? "No files to download"
                : (err.response?.data?.message || 'Download all failed');
            toast.error(msg);
        }
    };


    const handleRename = async (fileId, newName) => {
        if (!fileId || !newName) return;
        try {
            const res = await api.put(`/files/${fileId}`, { filename: newName });

            setFiles(files.map(f => f._id === fileId ? res.data.data : f));
            toast.success('File renamed');
        } catch {
            toast.error('Rename failed');
        }
    };

    const handleDelete = async (fileId) => {
        if (!window.confirm('Are you sure you want to delete this file?')) return;
        try {
            await api.delete(`/files/${fileId}`);
            setFiles(files.filter(f => f._id !== fileId));

            const deletedFile = files.find(f => f._id === fileId);
            if (deletedFile) {
                setUsedStorage(prev => Math.max(0, prev - deletedFile.size));
            }

            toast.success('File deleted');
        } catch {
            toast.error('Delete failed');
        }
    };

    return {
        isUploading,
        uploadProgress,
        uploadSpeed,
        uploadETA,
        handleUpload,
        handleDownload,
        handleDownloadAll,
        handleRename,
        handleDelete
    };
};

export default useFileActions;
