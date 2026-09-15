/**
 * Core authentication business logic: user registration, login, and the
 * JWT access/refresh token pairs issued for each.
 */

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const util = require('util');
const User = require('../models/User');
const tokenService = require('./tokenService');
const logger = require('../utils/logger');

const randomBytesAsync = util.promisify(crypto.randomBytes);

/**
 * Creates a new user account with a hashed password and a freshly
 * generated room ID, then issues an access/refresh token pair.
 *
 * @param {{email: string, password: string, firstName: string, lastName: string}} userData
 * @returns {Promise<Object>} Tokens, room ID, and the public user profile.
 * @throws {Error} If the email is already registered.
 */
exports.register = async (userData) => {
    const { email, password, firstName, lastName } = userData;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
        throw new Error('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    
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

    const { token: accessToken } = tokenService.signAccessToken({
        userId: user._id,
        isAdmin: user.isAdmin
    });

    const refreshToken = tokenService.signRefreshToken({ userId: user._id });

    return {
        token: accessToken, 
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
 * Verifies credentials and issues an access/refresh token pair,
 * registering or updating the given device as an authorized device on
 * the account. Always runs a bcrypt comparison, even for an unknown
 * email, so response timing doesn't reveal whether an account exists.
 *
 * @param {string} email
 * @param {string} password
 * @param {string} [deviceId]
 * @param {string} [deviceName]
 * @returns {Promise<Object>} Tokens, room ID, admin flag, and the public user profile.
 * @throws {Error} If the credentials are invalid, or `deviceId` was previously revoked via `/auth/revoke`.
 */
exports.login = async (email, password, deviceId, deviceName) => {
    const user = await User.findOne({ email });

    const hashToCompare = user ? user.password : await bcrypt.hash('dummy_password_for_timing', 10);
    const isMatch = await bcrypt.compare(password, hashToCompare);

    if (!user || !isMatch) {
        throw new Error('Invalid credentials');
    }

    if (deviceId && user.revokedDevices?.some(d => d.deviceId === deviceId)) {
        throw new Error('Device revoked');
    }

    const { token: accessToken, jti } = tokenService.signAccessToken({
        userId: user._id,
        isAdmin: user.isAdmin
    });

    const refreshToken = tokenService.signRefreshToken({ userId: user._id, deviceId });

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
        token: accessToken,
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
