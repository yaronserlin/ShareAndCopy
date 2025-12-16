const mongoose = require('mongoose');
const User = require('./models/User');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const makeAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected');

        const email = process.argv[2];
        if (!email) {
            console.error('Please provide an email address as an argument.');
            process.exit(1);
        }

        const user = await User.findOne({ email });
        if (!user) {
            console.error(`User with email ${email} not found.`);
            process.exit(1);
        }

        user.isAdmin = true;
        await user.save();
        console.log(`User ${email} is now an Admin.`);

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

makeAdmin();
