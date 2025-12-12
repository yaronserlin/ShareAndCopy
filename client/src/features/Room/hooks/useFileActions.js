import { useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../../utils/api';


const useFileActions = (files, setFiles, setUsedStorage) => {
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const handleUpload = async (file, isPublic) => {
        if (!file) return;

        setIsUploading(true);
        setUploadProgress(0);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('isPublic', isPublic);

            const res = await api.post('/files/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                },
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setUploadProgress(percentCompleted);
                }
            });
            setFiles([res.data, ...files]);
            setUsedStorage(prev => prev + res.data.size);
            toast.success('File uploaded successfully!');
            return true; // Success signal
        } catch (err) {
            console.error(err);
            console.log(err.response?.data?.message);

            toast.error(err.response?.data?.message || 'Upload failed');
            return false;
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
        }
    };

    const handleDownload = async (fileId, filename) => {
        try {
            const response = await api.get(`/files/download/${fileId}`, {
                responseType: 'blob'
            });

            // Download
            const isJson = response.data.type === 'application/json';
            if (isJson) {
                const text = await response.data.text();
                const json = JSON.parse(text);
                throw new Error(json.message || "Download failed");
            }

            const url = window.URL.createObjectURL(response.data);

            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            toast.success('Download started');
        } catch (err) {
            console.error('Download failed', err);
            toast.error(err.message || 'Download failed');
        }
    };

    const handleRename = async (file, newName) => {
        if (!file || !newName) return;
        try {
            const res = await api.put(`/files/${file._id}`, { filename: newName });

            setFiles(files.map(f => f._id === file._id ? res.data : f));
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
        handleUpload,
        handleDownload,
        handleRename,
        handleDelete
    };
};

export default useFileActions;
