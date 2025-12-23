const request = require('supertest');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

// Mock cron
jest.mock('../src/utils/cron', () => ({
    start: jest.fn()
}));

const app = require('../src/index');
const testDb = require('./testDb');
const User = require('../src/models/User');

// Create a dummy file for upload testing
const testFilePath = path.join(__dirname, 'testfile.txt');
beforeAll(() => {
    fs.writeFileSync(testFilePath, 'Hello World');
});

afterAll(() => {
    if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
    }
});

beforeAll(async () => {
    const conn = await testDb.connect();
    // Initialize GridFSBucket for files
    app.locals.gfsBucket = new mongoose.mongo.GridFSBucket(conn.db, { bucketName: 'uploads' });
}, 30000);

afterEach(async () => {
    await testDb.clear();
});

afterAll(async () => {
    await testDb.close();
});

describe('File Routes', () => {
    let token;
    let roomId;
    let userId;

    beforeEach(async () => {
        // Register a user to get token and roomId
        const res = await request(app)
            .post('/api/auth/register')
            .send({
                firstName: 'Test',
                lastName: 'User',
                email: `test-${Date.now()}@file.com`,
                password: 'Password1'
            });
        token = res.body.data.token;
        roomId = res.body.data.roomId;

        // Get user ID
        const meRes = await request(app).get('/api/auth/verify').set('x-auth-token', token);
        userId = meRes.body.data.user.id;
    });

    describe('POST /api/files/upload', () => {
        it('should upload a file successfully', async () => {
            const res = await request(app)
                .post('/api/files/upload')
                .set('x-auth-token', token)
                .attach('file', testFilePath);

            expect(res.statusCode).toBe(201);
            expect(res.body.data).toHaveProperty('filename');
            expect(res.body.data.filename).toBe('testfile.txt');
        });

        it('should fail with 400 if no file attached', async () => {
            const res = await request(app)
                .post('/api/files/upload')
                .set('x-auth-token', token);

            expect(res.statusCode).toBe(400);
        });

        it('should fail if unauthenticated', async () => {
            const res = await request(app)
                .post('/api/files/upload')
                .attach('file', testFilePath);

            expect([401, 403]).toContain(res.statusCode);
        });
    });

    describe('GET /api/files/room/:roomId', () => {
        it('should return empty list initially', async () => {
            const res = await request(app)
                .get(`/api/files/room/${roomId}`)
                .set('x-auth-token', token);

            expect(res.statusCode).toBe(200);
            expect(res.body.data.files).toHaveLength(0);
        });

        it('should return files after upload', async () => {
            // Upload file first
            await request(app)
                .post('/api/files/upload')
                .set('x-auth-token', token)
                .attach('file', testFilePath);

            const res = await request(app)
                .get(`/api/files/room/${roomId}`)
                .set('x-auth-token', token);

            expect(res.statusCode).toBe(200);
            expect(res.body.data.files).toHaveLength(1);
            expect(res.body.data.files[0].filename).toBe('testfile.txt');
        });
    });

    describe('DELETE /api/files/:id', () => {
        it('should delete a file', async () => {
            // Upload
            const uploadRes = await request(app)
                .post('/api/files/upload')
                .set('x-auth-token', token)
                .attach('file', testFilePath);
            const fileId = uploadRes.body.data._id;

            // Delete
            const delRes = await request(app)
                .delete(`/api/files/${fileId}`)
                .set('x-auth-token', token);

            expect(delRes.statusCode).toBe(200);
            expect(delRes.body.message).toMatch(/deleted/i);

            // Verify
            const listRes = await request(app)
                .get(`/api/files/room/${roomId}`)
                .set('x-auth-token', token);
            expect(listRes.body.data.files).toHaveLength(0);
        });
    });
});
