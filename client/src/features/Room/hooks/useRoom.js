import { useState, useEffect } from 'react';
import api from '../../../utils/api';
import toast from 'react-hot-toast';

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
                const res = await api.get(`/files/room/${roomId}`);
                const data = res.data.data;
                setFiles(data.files || []);
                setIsOwner(data.isOwner);
                if (data.ownerName) {
                    setOwnerName(data.ownerName);
                }
                if (data.usedStorage !== undefined) {
                    setUsedStorage(data.usedStorage);
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
