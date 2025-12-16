import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import API_BASE_URL from '../../../config';

/**
 * Custom hook for RoomHeader logic
 * @param {string} roomId - The current room ID
 * @param {boolean} isUploading - Upload status
 * @returns {Object} Hook values
 */
export const useRoomHeader = (roomId, isUploading) => {
    const [showQRModal, setShowQRModal] = useState(false);
    const [roomUrl, setRoomUrl] = useState(`${window.location.origin}/room/${roomId}`);
    const [showUploadProgress, setShowUploadProgress] = useState(false);

    // Handle Upload Progress Visibility
    useEffect(() => {
        let timer;
        if (isUploading) {
            setShowUploadProgress(true);
        } else if (showUploadProgress && !isUploading) {
            timer = setTimeout(() => {
                setShowUploadProgress(false);
            }, 3000);
        }
        return () => clearTimeout(timer);
    }, [isUploading, showUploadProgress]);

    // Fetch Server IP for Localhost
    useEffect(() => {
        const fetchServerIp = async () => {
            const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

            if (isLocal) {
                try {
                    const res = await axios.get(`${API_BASE_URL}/system/ip`);
                    if (res.data.ip) {
                        const protocol = window.location.protocol;
                        const port = window.location.port ? `:${window.location.port}` : '';
                        setRoomUrl(`${protocol}//${res.data.ip}${port}/room/${roomId}`);
                    }
                } catch (err) {
                    console.error('Failed to fetch server IP:', err);
                }
            }
        };

        fetchServerIp();
    }, [roomId]);

    const handleCopyUrl = async () => {
        try {
            await window.navigator.clipboard.writeText(roomUrl);
            toast.success('Room URL copied!');
        } catch (err) {
            console.warn('Clipboard API failed, trying fallback...');
            try {
                const textArea = document.createElement('textarea');
                textArea.value = roomUrl;
                textArea.style.position = 'fixed';
                textArea.style.left = '-9999px';
                textArea.style.top = '0';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                const successful = document.execCommand('copy');
                document.body.removeChild(textArea);

                if (successful) {
                    toast.success('Room URL copied!');
                } else {
                    throw new Error('Fallback copy failed');
                }
            } catch (fallbackErr) {
                console.error('Copy failed:', fallbackErr);
                toast.error('Could not copy URL automatically');
            }
        }
    };

    return {
        showQRModal,
        setShowQRModal,
        roomUrl,
        showUploadProgress,
        handleCopyUrl
    };
};
