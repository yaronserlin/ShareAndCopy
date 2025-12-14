import { useState, useEffect, useCallback } from 'react';

export const useFileList = (onRename) => {
    const [renamingFile, setRenamingFile] = useState(null);
    const [newFileName, setNewFileName] = useState('');
    const [fileExtension, setFileExtension] = useState('');

    useEffect(() => {
        if (renamingFile) {
            const lastDotIndex = renamingFile.filename.lastIndexOf('.');
            if (lastDotIndex !== -1) {
                setNewFileName(renamingFile.filename.substring(0, lastDotIndex));
                setFileExtension(renamingFile.filename.substring(lastDotIndex));
            } else {
                setNewFileName(renamingFile.filename);
                setFileExtension('');
            }
        } else {
            setNewFileName('');
            setFileExtension('');
        }
    }, [renamingFile]);

    const handleRenameClick = useCallback((file) => {
        setRenamingFile(file);
    }, []);

    const confirmRename = useCallback(() => {
        const fullNewName = newFileName + fileExtension;
        if (renamingFile && newFileName && fullNewName !== renamingFile.filename) {
            onRename(renamingFile._id, fullNewName);
        }
        setRenamingFile(null);
    }, [renamingFile, newFileName, fileExtension, onRename]);

    const cancelRename = useCallback(() => {
        setRenamingFile(null);
    }, []);

    return {
        renamingFile,
        newFileName,
        setNewFileName,
        fileExtension,
        handleRenameClick,
        confirmRename,
        cancelRename
    };
};
