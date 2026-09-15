/**
 * Web Push routes, mounted under `/api/push`. Everything but the public
 * configuration requires an authenticated session, since a subscription
 * is always tied to an account.
 */

const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const pushController = require('../controllers/pushController');
const {
    pushSubscribeSchema,
    pushUnsubscribeSchema,
    pushPreferencesSchema
} = require('../utils/validationSchemas');

router.get('/config', pushController.getConfig);

router.post('/subscribe', auth, validate(pushSubscribeSchema), pushController.subscribe);

router.post('/unsubscribe', auth, validate(pushUnsubscribeSchema), pushController.unsubscribe);

router.patch('/preferences', auth, validate(pushPreferencesSchema), pushController.updatePreferences);

router.get('/subscriptions', auth, pushController.listSubscriptions);

router.post('/test', auth, pushController.sendTest);

module.exports = router;
