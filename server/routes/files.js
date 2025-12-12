const express = require('express');
const router = express.Router();
const fileController = require('../controllers/fileController');

// Upload Route (Stream -> Encrypt -> GridFS)
router.post('/upload', fileController.uploadFile);

// Get Room Files (Public/Private Logic)
router.get('/room/:roomId', fileController.getRoomFiles);

// Download File (GridFS -> Decrypt -> Stream)
router.get('/download/:fileId', fileController.downloadFile);

// Update File Name
router.put('/:id', fileController.renameFile);

// Delete File
router.delete('/:id', fileController.deleteFile);

module.exports = router;
