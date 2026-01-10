const express = require('express');
const router = express.Router();
const { register } = require('../utils/metrics');
const logger = require('../utils/logger');

/**
 * @route   GET /metrics
 * @desc    Expose Prometheus metrics
 * @access  Public (Internal/VPC)
 */
router.get('/', async (req, res) => {
    try {
        res.set('Content-Type', register.contentType);
        console.log('Metrics Scraped');
        res.end(await register.metrics());
    } catch (err) {
        logger.error(`Metrics Error: ${err.message}`);
        res.status(500).send(err.message);
    }
});

module.exports = router;
