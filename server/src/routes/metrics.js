/**
 * Prometheus metrics endpoint, mounted under `/metrics`. Gated behind a
 * bearer token and disabled entirely (404) when `METRICS_TOKEN` is unset.
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const { register } = require('../utils/metrics');
const logger = require('../utils/logger');
const env = require('../config/env');

const metricsLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
});

/** Requires a `Bearer` token matching `env.METRICS_TOKEN`. */
const requireMetricsToken = (req, res, next) => {
    if (!env.METRICS_TOKEN) {
        return res.status(404).end();
    }

    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    const expected = Buffer.from(env.METRICS_TOKEN);
    const provided = token ? Buffer.from(token) : null;

    if (!provided || provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    next();
};


router.get('/', metricsLimiter, requireMetricsToken, async (req, res) => {
    try {
        res.set('Content-Type', register.contentType);
        res.end(await register.metrics());
    } catch (err) {
        logger.error(`Metrics Error: ${err.message}`);
        res.status(500).send(err.message);
    }
});

module.exports = router;
