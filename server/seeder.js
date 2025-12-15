const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { Readable } = require('stream');
const path = require('path');

// Load env vars
dotenv.config({ path: path.join(__dirname, '.env') });

// Import Models
const User = require('./models/User');
const FileModel = require('./models/File');

// Connection
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

const seedData = async () => {
    const conn = await connectDB();
    const gfsBucket = new mongoose.mongo.GridFSBucket(conn.connection.db, {
        bucketName: 'uploads'
    });

    try {
        // 1. WIPE DATABASE
        console.log('--- Wiping Database ---');
        await User.deleteMany({});
        console.log('Users deleted');
        await FileModel.deleteMany({});
        console.log('File metadata deleted');

        // Wipe GridFS
        const files = await gfsBucket.find().toArray();
        for (const file of files) {
            await gfsBucket.delete(file._id);
        }
        console.log('GridFS files deleted');

        // 2. SEED USERS
        console.log('--- Seeding Users ---');
        const hashedPassword = await bcrypt.hash('123456Aa', 10);

        const users = [];
        const userConfigs = [
            { email: 'user1@example.com', name: 'User', last: 'One' },
            { email: 'user2@example.com', name: 'User', last: 'Two' },
            { email: 'admin@example.com', name: 'Admin', last: 'User' }
        ];

        for (const config of userConfigs) {
            // Generate random room ID
            const roomId = crypto.randomBytes(8).toString('hex');

            const user = await User.create({
                email: config.email,
                password: hashedPassword,
                firstName: config.name,
                lastName: config.last,
                roomId: roomId,
                usedStorage: 0
            });
            users.push(user);
            console.log(`Created user: ${config.email} (Room: ${roomId})`);
        }

        // 3. SEED FILES
        console.log('--- Seeding Files ---');
        for (const user of users) {
            const fileCount = 3; // 3 files per user
            for (let i = 1; i <= fileCount; i++) {
                const content = `This is a test file number ${i} for user ${user.email}. Content: ${crypto.randomBytes(64).toString('hex')}`;
                const filename = `test_file_${i}.txt`;

                // Create readable stream from string
                const readableStream = new Readable();
                readableStream.push(content);
                readableStream.push(null);

                // Upload to GridFS
                const uploadStream = gfsBucket.openUploadStream(filename, {
                    metadata: {
                        contentType: 'text/plain' // Optional, but good practice
                    }
                });

                readableStream.pipe(uploadStream);

                // Wait for upload to finish to get the file info
                await new Promise((resolve, reject) => {
                    uploadStream.on('finish', resolve);
                    uploadStream.on('error', reject);
                });

                const fileId = uploadStream.id; // GridFS ID
                const fileSize = uploadStream.length || content.length; // Approximate if length not immediately available

                // Create Checksum
                const checksum = crypto.createHash('sha256').update(content).digest('hex');

                // Create Metadata
                await FileModel.create({
                    filename: filename,
                    gridFsId: fileId,
                    checksum: checksum,
                    size: fileSize,
                    isPublic: false,
                    owner: user._id
                });

                // Update User storage usage
                user.usedStorage += fileSize;
            }
            await user.save();
            console.log(`Seeded ${fileCount} files for ${user.email}`);
        }

        console.log('--- Data Imported Successfully ---');
        process.exit();
    } catch (err) {
        console.error(`${err}`);
        process.exit(1);
    }
};

seedData();
