/**
 * Development-only CLI script that wipes and re-seeds the database with
 * sample users and daily stats. Refuses to run when `NODE_ENV=production`.
 *
 * Usage: `node seeder.js`
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const User = require('./src/models/User');
const DailyStat = require('./src/models/DailyStat');

/**
 * Connects to MongoDB using `MONGO_URI`, exiting the process on failure.
 *
 * @returns {Promise<import('mongoose').Connection>}
 */
const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
        return conn;
    } catch (err) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
    }
};

/**
 * Wipes the users and daily-stats collections and repopulates them with
 * three sample users (with randomized devices and usage stats) and two
 * weeks of daily stats.
 *
 * @returns {Promise<void>}
 */
const seedData = async () => {
    if (process.env.NODE_ENV === 'production') {
        console.error('Refusing to run seeder against a production environment.');
        process.exit(1);
    }

    const conn = await connectDB();

    try {
        console.log('--- Wiping Database ---');
        await User.deleteMany({});
        console.log('Users deleted');

        await DailyStat.deleteMany({});
        console.log('Daily Stats deleted');

        console.log('--- Seeding Users ---');
        const seedPassword = process.env.SEED_PASSWORD || crypto.randomBytes(12).toString('base64url');
        const hashedPassword = await bcrypt.hash(seedPassword, 10);
        console.log(`Seed users password: ${seedPassword}`);

        const users = [];
        const userConfigs = [
            { email: 'user1@example.com', name: 'User', last: 'One', isAdmin: true },
            { email: 'user2@example.com', name: 'User', last: 'Two', isAdmin: false },
            { email: 'user3@example.com', name: 'User', last: 'Three', isAdmin: false }
        ];

        for (const config of userConfigs) {
            const roomId = crypto.randomBytes(8).toString('hex');

            const dataTransferred = Math.floor(Math.random() * 1000000000);
            const uploadCount = Math.floor(Math.random() * 50);
            const downloadCount = Math.floor(Math.random() * 100);

            const devices = [];
            const deviceCount = Math.floor(Math.random() * 3) + 1;
            for (let d = 0; d < deviceCount; d++) {
                devices.push({
                    deviceId: crypto.randomUUID(),
                    deviceName: `Device ${d + 1}`,
                    lastActive: new Date(Date.now() - Math.floor(Math.random() * 1000000000)),
                    jti: crypto.randomUUID()
                });
            }

            const user = await User.create({
                email: config.email,
                password: hashedPassword,
                firstName: config.name,
                lastName: config.last,
                roomId: roomId,
                usedStorage: 0,
                isAdmin: config.isAdmin || false,
                dataTransferred,
                uploadCount,
                downloadCount,
                authorizedDevices: devices
            });
            users.push(user);
            console.log(`Created user: ${config.email} (Room: ${roomId})`);
        }

        console.log('--- Seeding Daily Stats ---');
        const today = new Date();
        for (let i = 13; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            const dateString = date.toISOString().split('T')[0];

            await DailyStat.create({
                date: dateString,
                totalDataTransferred: Math.floor(Math.random() * 5000000000) + 100000000,
                totalUploads: Math.floor(Math.random() * 200) + 10,
                guestSessions: Math.floor(Math.random() * 50),
                activeUsers: Math.floor(Math.random() * 20) + 1
            });
            console.log(`Seeded stats for ${dateString}`);
        }

        console.log('--- Data Imported Successfully ---');
        process.exit();
    } catch (err) {
        console.error(`${err}`);
        process.exit(1);
    }
};

seedData();
