const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const util = require('util');
const User = require('../models/User');
const env = require('../config/env');
const logger = require('../utils/logger'); // Added logger for service-level specific logs if needed

const randomBytesAsync = util.promisify(crypto.randomBytes);

/**
 * Service for handling Authentication logic
 * @module services/authService
 */

/**
 * Register a new user
 * @async
 * @param {Object} userData - User registration data
 * @param {string} userData.email - User's email
 * @param {string} userData.password - User's plain text password
 * @param {string} userData.firstName - User's first name
 * @param {string} userData.lastName - User's last name
 * @returns {Promise<Object>} Returns object containing token, roomId, and user details
 * @throws {Error} If validation fails or database error occurs
 */
exports.register = async (userData) => {
    const { email, password, firstName, lastName } = userData;

    // Check for existing user explicitly to throw specific error message
    const existingUser = await User.findOne({ email });
    if (existingUser) {
        throw new Error('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate a secure random room ID (16 hex chars)
    const buffer = await randomBytesAsync(8);
    const roomId = buffer.toString('hex');

    const user = new User({
        email,
        password: hashedPassword,
        firstName,
        lastName,
        roomId
    });

    await user.save();

    // Generate token
    const token = jwt.sign(
        { id: user._id, isAdmin: user.isAdmin },
        env.JWT_SECRET,
        { expiresIn: '1h' }
    );

    return {
        token,
        roomId,
        user: {
            id: user._id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            isAdmin: user.isAdmin
        }
    };
};

/**
 * Login a user
 * @async
 * @param {string} email - User's email
 * @param {string} password - User's plain text password
 * @returns {Promise<Object>} Returns object containing token, roomId, and isAdmin status
 * @throws {Error} If credentials are invalid
 */
exports.login = async (email, password) => {
    const user = await User.findOne({ email });
    if (!user) {
        throw new Error('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        throw new Error('Invalid credentials');
    }

    const token = jwt.sign(
        { id: user._id, isAdmin: user.isAdmin },
        env.JWT_SECRET,
        { expiresIn: '1h' }
    );

    return {
        token,
        roomId: user.roomId,
        isAdmin: user.isAdmin,
        user: {
            id: user._id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName
        }
    };
};
