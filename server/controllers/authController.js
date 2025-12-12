const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');

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
    if (password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters' });
    if (!/[A-Z]/.test(password)) return res.status(400).json({ message: 'Password must contain an uppercase letter' });
    if (!/[a-z]/.test(password)) return res.status(400).json({ message: 'Password must contain a lowercase letter' });
    if (!/[0-9]/.test(password)) return res.status(400).json({ message: 'Password must contain a number' });

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        // Generate a random room ID (e.g., 16 hex chars)
        const roomId = crypto.randomBytes(8).toString('hex');

        const user = new User({ email, password: hashedPassword, firstName, lastName, roomId });
        await user.save();

        // Auto-login: Generate token immediately
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.status(201).json({ token, roomId });
    } catch (err) {
        console.error("Register Error:", err);
        if (err.code === 11000) {
            return res.status(400).json({ message: 'Email already exists' });
        }
        res.status(500).json({ error: err.message });
    }
};

exports.login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: 'Invalid credentials' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.json({ token, roomId: user.roomId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.verify = async (req, res) => {
    const token = req.header('x-auth-token');
    if (!token) return res.status(401).json({ message: 'No token, authorization denied' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (!user) return res.status(401).json({ message: 'User not found' });

        res.json({ valid: true, user: { id: user._id, email: user.email } });
    } catch (err) {
        res.status(401).json({ message: 'Token is not valid' });
    }
};
