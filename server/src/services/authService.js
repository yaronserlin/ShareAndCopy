/**
 * Preview: server/src/services/authService.js
 * Description: Server business logic service.
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const util = require('util');
const User = require('../models/User');
const env = require('../config/env');
const logger = require('../utils/logger'); 

const randomBytesAsync = util.promisify(crypto.randomBytes);




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

    
    const jti = crypto.randomUUID();
    const accessToken = jwt.sign(
        { id: user._id, isAdmin: user.isAdmin, jti },
        env.JWT_SECRET,
        { expiresIn: '1h' }
    );

    
    const refreshToken = jwt.sign(
        { id: user._id, type: 'refresh' },
        env.JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
    );

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


exports.login = async (email, password, deviceId, deviceName) => {
    const user = await User.findOne({ email });

    
    
    const hashToCompare = user ? user.password : await bcrypt.hash('dummy_password_for_timing', 10);
    const isMatch = await bcrypt.compare(password, hashToCompare);

    
    if (!user || !isMatch) {
        throw new Error('Invalid credentials');
    }

    const jti = crypto.randomUUID();
    const accessToken = jwt.sign(
        { id: user._id, isAdmin: user.isAdmin, jti },
        env.JWT_SECRET,
        { expiresIn: '1h' }
    );

    
    const refreshToken = jwt.sign(
        { id: user._id, type: 'refresh' },
        env.JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
    );

    
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
