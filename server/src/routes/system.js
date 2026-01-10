const express = require('express');
const router = express.Router();
const systemController = require('../controllers/systemController');

router.get('/ip', systemController.getServerIp);
router.get('/webrtc-config', systemController.getWebRTCConfig);

module.exports = router;
