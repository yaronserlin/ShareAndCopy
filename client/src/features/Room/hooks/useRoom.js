import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import API_BASE_URL from '../../../config';

const useRoom = (roomId) => {
    const [files, setFiles] = useState([]);
    const [isOwner, setIsOwner] = useState(false);
    const [usedStorage, setUsedStorage] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [roomNotFound, setRoomNotFound] = useState(false);
    const [ownerName, setOwnerName] = useState({ firstName: '', lastName: '' });

    useEffect(() => {
        const fetchFiles = async () => {
            try {
                const token = localStorage.getItem('token');
                const config = token ? { headers: { 'x-auth-token': token } } : {};

                const res = await axios.get(`${API_BASE_URL}/files/room/${roomId}`, config);
                setFiles(res.data.files);
                setIsOwner(res.data.isOwner);
                if (res.data.ownerName) {
                    setOwnerName(res.data.ownerName);
                }
                if (res.data.usedStorage !== undefined) {
                    setUsedStorage(res.data.usedStorage);
                }
            } catch (err) {
                if (err.response?.status === 404) {
                    setRoomNotFound(true);
                } else {
                    toast.error(err.response?.data?.message || 'Error fetching room');
                }
            } finally {
                setIsLoading(false);
            }
        };
        fetchFiles();
    }, [roomId]);

    return {
        files,
        setFiles,
        isOwner,
        usedStorage,
        setUsedStorage,
        isLoading,
        roomNotFound,
        ownerName
    };
};

export default useRoom;
