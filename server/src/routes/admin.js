/**
 * Preview: server/src/routes/admin.js
 * Description: Express route definition.
 */

const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const auth = require('../middleware/auth');
const isAdmin = require('../middleware/admin');


router.get('/stats', auth, isAdmin, adminController.getDashboardStats);

module.exports = router;
