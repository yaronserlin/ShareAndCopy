const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const adminMiddleware = require('../utils/adminMiddleware');

// Protect all admin routes
router.use(adminMiddleware);

// Dashboard Stats
router.get('/stats', adminController.getDashboardStats);

module.exports = router;
