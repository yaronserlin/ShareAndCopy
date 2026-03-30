/**
 * Preview: server/__tests__/testDb.js
 * Description: Node.js backend utility file.
 */

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;


exports.connect = async () => {
    
    await mongoose.disconnect();

    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
    return mongoose.connection;
};


exports.close = async () => {
    await mongoose.disconnect();
    if (mongoServer) {
        await mongoServer.stop();
    }
};


exports.clear = async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        const collection = collections[key];
        await collection.deleteMany();
    }
};


if (global.test) {
    test('Database helper loaded', () => {
        expect(true).toBe(true);
    });
}
