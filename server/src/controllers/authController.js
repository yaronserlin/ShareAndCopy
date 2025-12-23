const authService = require('../services/authService');
const logger = require('../utils/logger');
const responseHandler = require('../utils/responseHandler');

/**
 * Controller for Authentication operations.
 * Handles user registration, login, and token verification.
 * @module controllers/authController
 */

/**
 * Registers a new user in the system.
 *
 * @async
 * @function register
 * @param {Object} req - Express request object.
 * @param {Object} req.body - Request body containing user registration details.
 * @param {string} req.body.email - User's email address (must be unique).
 * @param {string} req.body.password - User's chosen password.
 * @param {string} req.body.firstName - User's first name.
 * @param {string} req.body.lastName - User's last name.
 * @param {Object} res - Express response object.
 * @returns {void} Sends a JSON response indicating success or failure.
 * @route POST /api/auth/register
 */
exports.register = async (req, res) => {
    // Log the initiation of a registration request
    logger.debug('Register request received');
    const { email, password, firstName, lastName } = req.body; // Destructure request body for clarity and direct access

    try {
        // Attempt to register the user via the authentication service
        const result = await authService.register({ email, password, firstName, lastName });
        // Log successful registration with user email and generated room ID
        logger.info(`New user registered: ${email} with room ID: ${result.roomId}`);
        // Send a success response with the new user's details and a 201 Created status
        responseHandler.success(res, result, 'User registered successfully', 201);
    } catch (err) {
        // Handle specific error case: email already exists
        if (err.message === 'Email already exists' || err.code === 11000) {
            logger.warn(`Registration failed: Email already exists - ${email}`);
            // Return a 400 Bad Request for duplicate email
            return responseHandler.error(res, 'Email already exists', null, 400);
        }
        // Handle any other unexpected registration errors
        logger.error(`Registration error for ${email}: ${err.message}`, err);
        // Send a generic error response with a 500 Internal Server Error status
        responseHandler.error(res, 'Registration failed', err.message);
    }
};

/**
 * Authenticates a user and provides a JWT token upon successful login.
 *
 * @async
 * @function login
 * @param {Object} req - Express request object.
 * @param {Object} req.body - Request body containing user credentials.
 * @param {string} req.body.email - User's email address.
 * @param {string} req.body.password - User's password.
 * @param {Object} res - Express response object.
 * @returns {void} Sends a JSON response with the authentication token.
 * @route POST /api/auth/login
 */
exports.login = async (req, res) => {
    // Log the initiation of a login request
    logger.debug('Login request received');
    const { email, password } = req.body; // Destructure email and password from the request body
    console.log(email, password);

    try {
        // Attempt to log in the user via the authentication service
        const result = await authService.login(email, password);
        // Log successful login
        logger.info(`User logged in: ${email}`);
        // Send a success response with the authentication token
        responseHandler.success(res, result, 'Login successful');
    } catch (err) {
        // Log the failure of the login attempt
        logger.warn(`Login failed for ${email}: ${err.message}`);
        // Handle specific error case: invalid credentials
        if (err.message.includes('Invalid credentials')) {
            // Return a 401 Unauthorized status for authentication failure
            return responseHandler.error(res, 'Invalid credentials', null, 401);
        }
        // Handle any other unexpected login errors
        logger.error(`Login error for ${email}: ${err.message}`, err);
        // Send a generic error response with a 500 Internal Server Error status
        responseHandler.error(res, 'Login failed', err.message);
    }
};

/**
 * Verifies the validity of a JWT token and returns the associated user details.
 * This endpoint assumes an authentication middleware has already validated the token
 * and attached the user object to `req.currentUser`.
 *
 * @function verify
 * @param {Object} req - Express request object.
 * @param {Object} req.currentUser - User object attached by the authentication middleware.
 * @param {Object} res - Express response object.
 * @returns {void} Sends a JSON response with the token's validity status and user data.
 * @route GET /api/auth/verify
 */
exports.verify = (req, res) => {
    // Log that the token has been successfully verified for the user
    logger.debug(`Token verified for user: ${req.currentUser.email}`);

    // Send a success response indicating the token is valid
    // and provide essential user details from the `req.currentUser` object.
    responseHandler.success(res, {
        valid: true, // Indicate that the token is valid
        user: {
            id: req.currentUser._id,
            email: req.currentUser.email,
            firstName: req.currentUser.firstName,
            lastName: req.currentUser.lastName,
            isAdmin: req.currentUser.isAdmin,
            roomId: req.currentUser.roomId
        }
    }, 'Token verified successfully');
};
