import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';

export const useUploadSection = (onUpload) => {
    const [selectedFile, setSelectedFile] = useState(null);
    const [isPublic, setIsPublic] = useState(false);
    const [dragActive, setDragActive] = useState(false);

    const handleDrag = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setSelectedFile(e.dataTransfer.files[0]);
        }
    }, []);

    const handleChange = useCallback((e) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    }, []);

    const handleSubmit = useCallback((e) => {
        e.preventDefault();
        if (selectedFile) {
            // Client-side Validation which allows most files but blocks dangerous scripts if needed.
            // The user code had a specific Forbidden list.
            const forbiddenExtensions = ['.exe', '.sh', '.bat', '.cmd', '.msi', '.bin', '.vbs', '.js', '.jar'];
            const ext = "." + selectedFile.name.split('.').pop().toLowerCase();
            if (forbiddenExtensions.includes(ext)) {
                // Using toast instead of alert for better UX
                toast.error(`File type ${ext} is not allowed for security reasons.`);
                return;
            }

            onUpload(selectedFile, isPublic);
            setSelectedFile(null);
        }
    }, [selectedFile, isPublic, onUpload]);

    return {
        selectedFile,
        setSelectedFile,
        isPublic,
        setIsPublic,
        dragActive,
        handleDrag,
        handleDrop,
        handleChange,
        handleSubmit
    };
};
