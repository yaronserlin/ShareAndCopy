import React from 'react';
import { useFileList } from './useFileList';
import FileCard from './components/FileCard';
import FileRenameModal from './components/FileRenameModal';
import styles from './FileList.module.css';

const FileList = ({ files, isOwner, onDownload, onRename, onDelete }) => {
    const {
        renamingFile,
        newFileName,
        setNewFileName,
        fileExtension,
        handleRenameClick,
        confirmRename,
        cancelRename
    } = useFileList(onRename);

    if (files.length === 0) {
        return (
            <div className="text-center py-5 text-secondary border border-secondary border-dashed rounded-4 h-100 d-flex flex-column align-items-center justify-content-center">
                <i className="bi bi-folder2-open display-4 mb-3 opacity-50"></i>
                <p className="mb-0 fs-5">No files shared yet.</p>
                <p className="small opacity-75">Upload a file to get started.</p>
            </div>
        );
    }

    return (
        <>
            <div className="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-3">
                {files.map(file => (
                    <div key={file._id} className="col">
                        <FileCard
                            file={file}
                            isOwner={isOwner}
                            onDownload={onDownload}
                            onDelete={onDelete}
                            onRenameClick={handleRenameClick}
                        />
                    </div>
                ))}
            </div>

            <FileRenameModal
                renamingFile={renamingFile}
                newFileName={newFileName}
                fileExtension={fileExtension}
                onClose={cancelRename}
                onSave={confirmRename}
                onNameChange={setNewFileName}
            />
        </>
    );
};

export default FileList;
