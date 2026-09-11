/**
 * Preview: server/src/routes/auth.js
 * Description: Express route definition.
 */

const express = require('express');
const router = express.Router();


const authController = require('../controllers/authController');


const validate = require('../middleware/validate');
const auth = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');


const { registerSchema, loginSchema, revokeSchema } = require('../utils/validationSchemas');


router.post(
    '/register',
    authLimiter,
    validate(registerSchema),
    authController.register
);


router.post(
    '/login',
    authLimiter,
    validate(loginSchema),
    authController.login
);

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const env = require('../config/env');
const logger = require('../utils/logger');
const pairingStore = require('../utils/pairingStore');
const { setAuthCookies } = require('../utils/cookies');


router.post('/pairing-code', authLimiter, auth, async (req, res) => {
    try {

        const code = crypto.randomBytes(3).toString('hex').toUpperCase().substring(0, 6);
        const expiresIn = 60 * 5;


        const pairingToken = jwt.sign(
            { id: req.user.id, scope: 'pairing', code },
            env.JWT_SECRET,
            { expiresIn }
        );

        pairingStore.set(code, req.user.id, pairingToken, expiresIn * 1000);

        res.json({ code, pairingToken, expiresIn });
    } catch (err) {
        logger.error(`Pairing Code Error: ${err.message}`);
        res.status(500).json({ message: 'Server error generating code' });
    }
});



router.post(
    '/verify-pairing',
    authLimiter,
    async (req, res) => {
        const { code } = req.body;

        const entry = pairingStore.consume(code);
        if (entry) {
            res.json({ valid: true, pairingToken: entry.token });
        } else {
            res.status(400).json({ valid: false, message: 'Invalid or expired code' });
        }
    }
);


router.post('/adopt-token', (req, res) => {
    const { token } = req.body;

    if (!token) {
        return res.status(400).json({ message: 'Token is required' });
    }

    try {
        const decoded = jwt.verify(token, env.JWT_SECRET);
        if (decoded.scope !== 'guest' && !decoded.isGuest) {
            return res.status(400).json({ message: 'Token is not adoptable' });
        }
        setAuthCookies(res, { accessToken: token });
        res.json({ success: true });
    } catch (err) {
        logger.warn(`Adopt-token failed: ${err.message}`);
        res.status(400).json({ message: 'Invalid token' });
    }
});


router.post('/logout', auth, authController.logout);


router.post('/revoke', auth, validate(revokeSchema), authController.revokeDevice);


router.get(
    '/verify',
    auth,
    authController.verify
);


const { refreshToken } = require('../controllers/refreshTokenController');
router.post('/refresh', refreshToken);

module.exports = router;
