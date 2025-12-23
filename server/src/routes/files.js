const express = require('express');
const router = express.Router();
const fileController = require('../controllers/fileController');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const { renameFileSchema } = require('../utils/validationSchemas');

/**
 * @route   POST api/files/upload
 * @desc    Upload a file
 * @access  Private
 */
router.post('/upload', auth, fileController.uploadFile);

/**
 * @route   GET api/files/room/:roomId
 * @desc    Get all files in a room
 * @access  Public (Optional Auth)
 */
router.get('/room/:roomId', auth.optional, fileController.getRoomFiles);

/**
 * @route   GET api/files/:fileId/download-token
 * @desc    Generate download token
 * @access  Public (Optional Auth)
 */
router.get('/:fileId/download-token', auth.optional, fileController.generateDownloadToken);

/**
 * @route   GET api/files/download/:fileId
 * @desc    Download file
 * @access  Public (Token or Header)
 */
router.get('/download/:fileId', auth.optional, fileController.downloadFile);

/**
 * @route   GET api/files/download-all-token/:roomId
 * @desc    Generate download all token
 * @access  Public (Optional Auth)
 */
router.get('/download-all-token/:roomId', auth.optional, fileController.generateDownloadAllToken);

/**
 * @route   GET api/files/download-all/:roomId
 * @desc    Download all files
 * @access  Public (Token)
 */
router.get('/download-all/:roomId', auth.optional, fileController.downloadAllFiles);

/**
 * @route   PUT api/files/:id
 * @desc    Rename file
 * @access  Private
 * @body    {filename}
 */
router.put('/:id', auth, validate(renameFileSchema), fileController.renameFile);

/**
 * @route   DELETE api/files/:id
 * @desc    Delete file
 * @access  Private
 */
router.delete('/:id', auth, fileController.deleteFile);

module.exports = router;
