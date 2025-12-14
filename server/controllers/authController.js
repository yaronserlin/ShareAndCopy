const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const util = require('util');
const User = require('../models/User');
const logger = require('../utils/logger');
const responseHandler = require('../utils/responseHandler');

const randomBytesAsync = util.promisify(crypto.randomBytes);

exports.register = async (req, res) => {
    const { email, password, firstName, lastName } = req.body;

    const nameRegex = /^[A-Za-z]+$/;
    if (firstName && !nameRegex.test(firstName)) {
        return res.status(400).json({ message: 'First name must contain only English letters' });
    }
    if (lastName && !nameRegex.test(lastName)) {
        return res.status(400).json({ message: 'Last name must contain only English letters' });
    }

    // Password Validation
    if (password.length < 8) return responseHandler.error(res, 'Password must be at least 8 characters', null, 400);
    if (!/[A-Z]/.test(password)) return responseHandler.error(res, 'Password must contain an uppercase letter', null, 400);
    if (!/[a-z]/.test(password)) return responseHandler.error(res, 'Password must contain a lowercase letter', null, 400);
    if (!/[0-9]/.test(password)) return responseHandler.error(res, 'Password must contain a number', null, 400);

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        // Generate a random room ID (e.g., 16 hex chars) - Non-blocking
        const buffer = await randomBytesAsync(8);
        const roomId = buffer.toString('hex');

        const user = new User({ email, password: hashedPassword, firstName, lastName, roomId });
        await user.save();

        // Auto-login: Generate token immediately
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

        logger.info(`New user registered: ${email}`);
        responseHandler.success(res, { token, roomId }, 'User registered successfully', 201);
    } catch (err) {
        if (err.code === 11000) {
            return responseHandler.error(res, 'Email already exists', null, 400);
        }
        responseHandler.error(res, 'Registration failed', err);
    }
};

exports.login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) return responseHandler.error(res, 'Invalid credentials', null, 400);

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return responseHandler.error(res, 'Invalid credentials', null, 400);

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        responseHandler.success(res, { token, roomId: user.roomId }, 'Login successful');
    } catch (err) {
        responseHandler.error(res, 'Login failed', err);
    }
};

exports.verify = async (req, res) => {
    const token = req.header('x-auth-token');
    if (!token) return responseHandler.error(res, 'No token, authorization denied', null, 401);

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (!user) return responseHandler.error(res, 'User not found', null, 401);

        responseHandler.success(res, { valid: true, user: { id: user._id, email: user.email } });
    } catch (err) {
        responseHandler.error(res, 'Token is not valid', null, 401);
    }
};
