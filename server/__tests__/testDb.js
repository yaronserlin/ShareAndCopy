const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

/**
 * Connect to the in-memory database.
 */
exports.connect = async () => {
    // Prevent MongooseError: Can't call `openUri()` on an active connection with different connection strings
    await mongoose.disconnect();

    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
    return mongoose.connection;
};

/**
 * Close the connection and stop the in-memory database.
 */
exports.close = async () => {
    await mongoose.disconnect();
    if (mongoServer) {
        await mongoServer.stop();
    }
};

/**
 * Clear all data in the database.
 */
exports.clear = async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        const collection = collections[key];
        await collection.deleteMany();
    }
};

// Dummy test to satisfy Jest
if (global.test) {
    test('Database helper loaded', () => {
        expect(true).toBe(true);
    });
}
