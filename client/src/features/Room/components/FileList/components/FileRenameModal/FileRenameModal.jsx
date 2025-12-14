import React, { memo } from 'react';
import Modal from '../../../../../../components/common/Modal';
import styles from './FileRenameModal.module.css';

const FileRenameModal = ({
    renamingFile,
    newFileName,
    fileExtension,
    onClose,
    onSave,
    onNameChange
}) => {
    if (!renamingFile) return null;

    return (
        <Modal onClose={onClose}>
            <div className={`p-2 ${styles.modalContent}`}>
                <h3 className="h5 mb-3 fw-bold">Rename File</h3>
                <div className="input-group mb-3">
                    <input
                        type="text"
                        className="form-control"
                        value={newFileName}
                        onChange={(e) => onNameChange(e.target.value)}
                        autoFocus
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') onSave();
                            if (e.key === 'Escape') onClose();
                        }}
                    />
                    {fileExtension && (
                        <span className="input-group-text text-secondary bg-secondary bg-opacity-10 border-secondary border-opacity-25">
                            {fileExtension}
                        </span>
                    )}
                </div>
                <div className="d-flex justify-content-end gap-2">
                    <button
                        className="btn btn-secondary btn-sm"
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                    <button
                        className="btn btn-primary btn-sm"
                        onClick={onSave}
                        disabled={!newFileName.trim() || (newFileName + fileExtension) === renamingFile.filename}
                    >
                        Save Changes
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default memo(FileRenameModal);
