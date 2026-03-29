const express = require('express');
const router = express.Router();

// Controllers
const authController = require('../controllers/authController');

// Middleware
const validate = require('../middleware/validate');
const auth = require('../middleware/auth');

// Validation Schemas
const { registerSchema, loginSchema, revokeSchema } = require('../utils/validationSchemas');

/**
 * @route   POST api/auth/register
 * @desc    Register a new user with email, password, and name
 * @access  Public
 * @body    {email, password, firstName, lastName}
 */
router.post(
    '/register',
    validate(registerSchema), // Validate request body against schema
    authController.register // Handle registration logic
);

/**
 * @route   POST api/auth/login
 * @desc    Authenticate user and return JWT token
 * @access  Public
 * @body    {email, password}
 */
router.post(
    '/login',
    validate(loginSchema), // Validate request body against schema
    authController.login // Handle login logic
);

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const env = require('../config/env');
const logger = require('../utils/logger');
const redis = require('../config/redis');

// --- Pairing Logic ---
// Fallback in-memory storage if Redis is unavailable
const pairingCodesMemory = new Map();

// Generate Pairing Code (Authenticated Device)
router.post('/pairing-code', auth, async (req, res) => {
    try {
        // SECURITY: Use crypto-secure random instead of Math.random()
        const code = crypto.randomBytes(3).toString('hex').toUpperCase().substring(0, 6);
        const expiresIn = 60 * 5; // 5 minutes

        // Generate a temporary pairing token
        const pairingToken = jwt.sign(
            { id: req.user.id, scope: 'pairing', code },
            env.JWT_SECRET,
            { expiresIn }
        );

        const pairingData = JSON.stringify({ userId: req.user.id, token: pairingToken });

        // Try Redis first, fallback to memory
        const stored = await redis.setWithExpiry(`pairing:${code}`, pairingData, expiresIn);

        if (!stored) {
            // Fallback to in-memory storage
            logger.warn('Redis unavailable, using in-memory pairing storage');
            pairingCodesMemory.set(code, { userId: req.user.id, token: pairingToken });
            setTimeout(() => pairingCodesMemory.delete(code), expiresIn * 1000);
        }

        res.json({ code, pairingToken, expiresIn });
    } catch (err) {
        logger.error(`Pairing Code Error: ${err.message}`);
        res.status(500).json({ message: 'Server error generating code' });
    }
});

// Verify Pairing Code (New Device -> Requesting Pairing)
// This strictly verifies existence, actual handshake happens over socket
router.post(
    '/verify-pairing',
    async (req, res) => {
        const { code } = req.body;

        // Try Redis first
        const redisData = await redis.get(`pairing:${code}`);

        if (redisData) {
            const { token } = JSON.parse(redisData);
            res.json({ valid: true, pairingToken: token });
        } else if (pairingCodesMemory.has(code)) {
            // Fallback to in-memory
            const { token } = pairingCodesMemory.get(code);
            res.json({ valid: true, pairingToken: token });
        } else {
            res.status(400).json({ valid: false, message: 'Invalid or expired code' });
        }
    }
);

/**
 * @route   POST api/auth/revoke
 * @desc    Revoke a device token effectively kicking them
 * @access  Private (Host)
 */
router.post('/revoke', auth, validate(revokeSchema), authController.revokeDevice);

/**
 * @route   GET api/auth/verify
 * @desc    Verify the validity of a JWT token and return associated user data
 * @access  Private (Requires Bearer Token)
 */
router.get(
    '/verify',
    auth, // Verify JWT token middleware
    authController.verify // Return user data if token is valid
);

/**
 * @route   POST api/auth/refresh
 * @desc    Refresh access token using refresh token
 * @access  Public
 */
const { refreshToken } = require('../controllers/refreshTokenController');
router.post('/refresh', refreshToken);

module.exports = router;
