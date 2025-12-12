const express = require('express');
const router = express.Router();
const os = require('os');

// @route   GET api/system/ip
// @desc    Get server's local network IP
// @access  Public
router.get('/ip', (req, res) => {
    try {
        const interfaces = os.networkInterfaces();
        let serverIp = null;

        for (const name of Object.keys(interfaces)) {
            for (const iface of interfaces[name]) {
                // Skip internal (i.e. 127.0.0.1) and non-IPv4 addresses
                if ('IPv4' !== iface.family || iface.internal) {
                    continue;
                }
                serverIp = iface.address;
                break;
            }
            if (serverIp) break;
        }

        if (serverIp) {
            res.json({ ip: serverIp });
        } else {
            res.status(404).json({ msg: 'Local IP not found' });
        }
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
