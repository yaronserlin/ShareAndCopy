/**
 * Routes for admin-only endpoints, mounted under `/api/admin`.
 */

const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const auth = require('../middleware/auth');
const isAdmin = require('../middleware/admin');

router.get('/stats', auth, isAdmin, adminController.getDashboardStats);

module.exports = router;
