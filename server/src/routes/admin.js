const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const auth = require('../middleware/auth');
const isAdmin = require('../middleware/admin');

/**
 * @route   GET api/admin/stats
 * @desc    Get admin dashboard stats
 * @access  Private/Admin
 */
router.get('/stats', auth, isAdmin, adminController.getDashboardStats);

module.exports = router;
