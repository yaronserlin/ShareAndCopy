const express = require('express');
const router = express.Router();

// Controllers
const authController = require('../controllers/authController');

// Middleware
const validate = require('../middleware/validate');
const auth = require('../middleware/auth');

// Validation Schemas
const { registerSchema, loginSchema } = require('../utils/validationSchemas');

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
const env = require('../config/env');
const logger = require('../utils/logger');

// --- Pairing Logic ---
const pairingCodes = new Map(); // Store codes in memory (or Redis in production)

// Generate Pairing Code (Authenticated Device)
router.post('/pairing-code', auth, (req, res) => {
    try {
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        const expiresIn = 60 * 5; // 5 minutes

        // Generate a temporary pairing token
        const pairingToken = jwt.sign(
            { id: req.user.id, scope: 'pairing', code },
            env.JWT_SECRET,
            { expiresIn }
        );

        pairingCodes.set(code, { userId: req.user.id, token: pairingToken });

        // Auto-cleanup
        setTimeout(() => pairingCodes.delete(code), expiresIn * 1000);

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
    (req, res) => {
        const { code } = req.body;
        if (pairingCodes.has(code)) {
            const { token } = pairingCodes.get(code);
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
router.post('/revoke', auth, authController.revokeDevice);

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

module.exports = router;
