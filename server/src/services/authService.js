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

    // Generate token with JTI
    const jti = crypto.randomUUID();
    const accessToken = jwt.sign(
        { id: user._id, isAdmin: user.isAdmin, jti },
        env.JWT_SECRET,
        { expiresIn: '1h' }
    );

    // SEC-08: Generate refresh token with 7-day expiry
    const refreshToken = jwt.sign(
        { id: user._id, type: 'refresh' },
        env.JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
    );

    return {
        token: accessToken, // Keep 'token' for backward compatibility
        accessToken,
        refreshToken,
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
exports.login = async (email, password, deviceId, deviceName) => {
    const user = await User.findOne({ email });

    // SECURITY: Always perform bcrypt comparison, even if user doesn't exist
    // This prevents timing attacks that could reveal whether an email is registered
    const hashToCompare = user ? user.password : await bcrypt.hash('dummy_password_for_timing', 10);
    const isMatch = await bcrypt.compare(password, hashToCompare);

    // Return same error for both "user not found" and "invalid password"
    if (!user || !isMatch) {
        throw new Error('Invalid credentials');
    }

    const jti = crypto.randomUUID();
    const accessToken = jwt.sign(
        { id: user._id, isAdmin: user.isAdmin, jti },
        env.JWT_SECRET,
        { expiresIn: '1h' }
    );

    // SEC-08: Generate refresh token with 7-day expiry
    const refreshToken = jwt.sign(
        { id: user._id, type: 'refresh' },
        env.JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
    );

    // Update Authorized Devices with JTI
    if (deviceId) {
        const deviceIndex = user.authorizedDevices.findIndex(d => d.deviceId === deviceId);
        if (deviceIndex > -1) {
            user.authorizedDevices[deviceIndex].jti = jti;
            user.authorizedDevices[deviceIndex].lastActive = new Date();
            if (deviceName) user.authorizedDevices[deviceIndex].deviceName = deviceName;
        } else {
            user.authorizedDevices.push({
                deviceId,
                deviceName: deviceName || 'Unknown Device',
                lastActive: new Date(),
                jti
            });
        }
        await user.save();
    }

    return {
        token: accessToken, // Keep 'token' for backward compatibility
        accessToken,
        refreshToken,
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
