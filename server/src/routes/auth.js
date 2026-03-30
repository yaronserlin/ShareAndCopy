/**
 * Preview: server/src/routes/auth.js
 * Description: Express route definition.
 */

const express = require('express');
const router = express.Router();


const authController = require('../controllers/authController');


const validate = require('../middleware/validate');
const auth = require('../middleware/auth');


const { registerSchema, loginSchema, revokeSchema } = require('../utils/validationSchemas');


router.post(
    '/register',
    validate(registerSchema),
    authController.register
);


router.post(
    '/login',
    validate(loginSchema),
    authController.login
);

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const env = require('../config/env');
const logger = require('../utils/logger');
// const redis = require('../config/redis');



const pairingCodesMemory = new Map();


router.post('/pairing-code', auth, async (req, res) => {
    try {

        const code = crypto.randomBytes(3).toString('hex').toUpperCase().substring(0, 6);
        const expiresIn = 60 * 5;


        const pairingToken = jwt.sign(
            { id: req.user.id, scope: 'pairing', code },
            env.JWT_SECRET,
            { expiresIn }
        );

        const pairingData = JSON.stringify({ userId: req.user.id, token: pairingToken });


        // const stored = await redis.setWithExpiry(`pairing:${code}`, pairingData, expiresIn);

        // if (!stored) {

        // logger.warn('Redis unavailable, using in-memory pairing storage');
        pairingCodesMemory.set(code, { userId: req.user.id, token: pairingToken });
        setTimeout(() => pairingCodesMemory.delete(code), expiresIn * 1000);
        // }

        res.json({ code, pairingToken, expiresIn });
    } catch (err) {
        logger.error(`Pairing Code Error: ${err.message}`);
        res.status(500).json({ message: 'Server error generating code' });
    }
});



router.post(
    '/verify-pairing',
    async (req, res) => {
        const { code } = req.body;


        // const redisData = await redis.get(`pairing:${code}`);

        // if (redisData) {
        //     const { token } = JSON.parse(redisData);
        //     res.json({ valid: true, pairingToken: token });
        // } else 
        if (pairingCodesMemory.has(code)) {

            const { token } = pairingCodesMemory.get(code);
            res.json({ valid: true, pairingToken: token });
        } else {
            res.status(400).json({ valid: false, message: 'Invalid or expired code' });
        }
    }
);


router.post('/revoke', auth, validate(revokeSchema), authController.revokeDevice);


router.get(
    '/verify',
    auth,
    authController.verify
);


const { refreshToken } = require('../controllers/refreshTokenController');
router.post('/refresh', refreshToken);

module.exports = router;
