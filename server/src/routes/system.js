const express = require('express');
const router = express.Router();
const systemController = require('../controllers/systemController');

router.get('/ip', systemController.getServerIp);

module.exports = router;
