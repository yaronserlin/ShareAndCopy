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
