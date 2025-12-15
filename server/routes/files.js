const express = require('express');
const router = express.Router();
const fileController = require('../controllers/fileController');

// Upload Route (Stream -> Encrypt -> GridFS)
router.post('/upload', fileController.uploadFile);

// Get Room Files (Public/Private Logic)
router.get('/room/:roomId', fileController.getRoomFiles);

// Download Token
router.get('/:fileId/download-token', fileController.generateDownloadToken);

// Download File (GridFS -> Decrypt -> Stream)
router.get('/download/:fileId', fileController.downloadFile);

// Download All Files (ZIP Stream)
router.get('/download-all-token/:roomId', fileController.generateDownloadAllToken);
router.get('/download-all/:roomId', fileController.downloadAllFiles);

// Update File Name
router.put('/:id', fileController.renameFile);

// Delete File
router.delete('/:id', fileController.deleteFile);

module.exports = router;
