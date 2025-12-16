const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const util = require('util');
const User = require('../models/User');
const logger = require('../utils/logger');
const responseHandler = require('../utils/responseHandler');

const randomBytesAsync = util.promisify(crypto.randomBytes);

exports.register = async (req, res) => {
    logger.debug('Register request received');
    const { email, password, firstName, lastName } = req.body;

    const nameRegex = /^[A-Za-z]+$/;
    if (firstName && !nameRegex.test(firstName)) {
        logger.warn(`Registration failed: Invalid first name format for email ${email}`);
        return responseHandler.error(res, 'First name must contain only English letters', null, 400);
    }
    if (lastName && !nameRegex.test(lastName)) {
        logger.warn(`Registration failed: Invalid last name format for email ${email}`);
        return responseHandler.error(res, 'Last name must contain only English letters', null, 400);
    }

    // Password Validation
    if (password.length < 8) {
        logger.warn(`Registration failed: Password too short for email ${email}`);
        return responseHandler.error(res, 'Password must be at least 8 characters', null, 400);
    }
    if (!/[A-Z]/.test(password)) {
        logger.warn(`Registration failed: Password missing uppercase for email ${email}`);
        return responseHandler.error(res, 'Password must contain an uppercase letter', null, 400);
    }
    if (!/[a-z]/.test(password)) {
        logger.warn(`Registration failed: Password missing lowercase for email ${email}`);
        return responseHandler.error(res, 'Password must contain a lowercase letter', null, 400);
    }
    if (!/[0-9]/.test(password)) {
        logger.warn(`Registration failed: Password missing number for email ${email}`);
        return responseHandler.error(res, 'Password must contain a number', null, 400);
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        // Generate a random room ID (e.g., 16 hex chars) - Non-blocking
        const buffer = await randomBytesAsync(8);
        const roomId = buffer.toString('hex');

        const user = new User({ email, password: hashedPassword, firstName, lastName, roomId });
        await user.save();

        // Auto-login: Generate token immediately
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

        logger.info(`New user registered: ${email} with room ID: ${roomId}`);
        responseHandler.success(res, { token, roomId }, 'User registered successfully', 201);
    } catch (err) {
        if (err.code === 11000) {
            logger.warn(`Registration failed: Email already exists - ${email}`);
            return responseHandler.error(res, 'Email already exists', null, 400);
        }
        logger.error(`Registration error for ${email}: ${err.message}`);
        responseHandler.error(res, 'Registration failed', err);
    }
};

exports.login = async (req, res) => {
    logger.debug('Login request received');
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) {
            logger.warn(`Login failed: User not found - ${email}`);
            return responseHandler.error(res, 'Invalid credentials', null, 400);
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            logger.warn(`Login failed: Invalid password - ${email}`);
            return responseHandler.error(res, 'Invalid credentials', null, 400);
        }

        const token = jwt.sign({ id: user._id, isAdmin: user.isAdmin }, process.env.JWT_SECRET, { expiresIn: '1h' });
        logger.info(`User logged in: ${email}`);
        responseHandler.success(res, { token, roomId: user.roomId, isAdmin: user.isAdmin }, 'Login successful');
    } catch (err) {
        logger.error(`Login error for ${email}: ${err.message}`);
        responseHandler.error(res, 'Login failed', err);
    }
};

exports.verify = async (req, res) => {
    logger.debug('Token verification request received');
    const token = req.header('x-auth-token');
    if (!token) {
        logger.warn('Token verification failed: No token provided');
        return responseHandler.error(res, 'No token, authorization denied', null, 401);
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (!user) {
            logger.warn(`Token verification failed: User not found for ID ${decoded.id}`);
            return responseHandler.error(res, 'User not found', null, 401);
        }

        logger.debug(`Token verified for user: ${user.email}`);
        responseHandler.success(res, { valid: true, user: { id: user._id, email: user.email, isAdmin: user.isAdmin } });
    } catch (err) {
        logger.warn(`Token verification failed: ${err.message}`);
        responseHandler.error(res, 'Token is not valid', null, 401);
    }
};
