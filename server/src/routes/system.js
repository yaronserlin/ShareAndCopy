const express = require('express');
const router = express.Router();
const systemController = require('../controllers/systemController');

/**
 * @route   GET api/system/ip
 * @desc    Get server's local network IP
 * @access  Public
 */
router.get('/ip', systemController.getServerIp);

module.exports = router;
