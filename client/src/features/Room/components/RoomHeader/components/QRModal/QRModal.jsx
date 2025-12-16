import React from 'react';
import PropTypes from 'prop-types';
import QRCode from 'react-qr-code';
import Modal from '../../../../../../components/common/Modal/Modal';
import styles from './QRModal.module.css';

/**
 * QR Code Modal Component
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Is modal open
 * @param {Function} props.onClose - Close handler
 * @param {string} props.roomUrl - The Room URL
 * @param {Function} props.onCopyUrl - Copy URL handler
 * @returns {JSX.Element|null} Rendered component
 */
const QRModal = ({ isOpen, onClose, roomUrl, onCopyUrl }) => {
    if (!isOpen) return null;

    return (
        <Modal onClose={onClose}>
            <div className="text-center">
                <h4 className="mb-4 fw-bold text-primary">Scan to Share</h4>
                <div
                    className={`${styles.qrBigContainer} p-3 bg-white rounded-3 shadow-sm mx-auto mb-3 cursor-pointer`}
                    onClick={onCopyUrl}
                    title="Click QR to copy URL"
                    style={{ width: 'fit-content' }}
                >
                    <QRCode value={roomUrl} size={250} style={{ maxWidth: '100%', height: 'auto' }} />
                </div>
                <p className="text-secondary small mb-1">Click the QR code to copy the link</p>
                <div className="input-group mb-3">
                    <input
                        type="text"
                        className="form-control text-center text-primary fw-bold bg-light-subtle text-body"
                        value={roomUrl}
                        readOnly
                        onClick={(e) => e.target.select()}
                        style={{ cursor: 'pointer' }}
                    />
                </div>
            </div>
        </Modal>
    );
};

QRModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    roomUrl: PropTypes.string.isRequired,
    onCopyUrl: PropTypes.func.isRequired,
};

export default QRModal;
