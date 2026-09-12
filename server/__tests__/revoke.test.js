/**
 * Regression tests for POST /api/auth/revoke actually preventing the
 * revoked device from regaining access, rather than only killing its
 * live session.
 */

const request = require('supertest');
const { createServer } = require('http');
const jwt = require('jsonwebtoken');

const app = require('../src/index');
const testDb = require('./testDb');
const User = require('../src/models/User');
const initSocket = require('../src/socket');
const env = require('../src/config/env');

// Each test file spins up its own mongodb-memory-server instance; under
// Jest's parallel workers plus bcrypt's cost-10 hashing on every
// register/login call here, the default 5s per-test timeout is
// occasionally too tight purely from resource contention, not from a
// slow test itself.
jest.setTimeout(20000);

beforeAll(async () => {
    await testDb.connect();
    // `authController.revokeDevice` calls `getIO()`, which is only
    // populated once `initSocket` has run; the app itself only does this
    // via its own `startServer()`, which doesn't run under `require()`.
    initSocket(createServer());
}, 30000);

afterEach(async () => {
    await testDb.clear();
});

afterAll(async () => {
    await testDb.close();
});

describe('POST /api/auth/revoke', () => {
    const generateUser = () => ({
        firstName: 'John',
        lastName: 'Doe',
        email: `revoke-${Date.now()}-${Math.random()}@example.com`,
        password: 'Password1'
    });

    it('blocks the revoked device from logging back in with the correct password', async () => {
        const mockUser = generateUser();
        const deviceId = 'revoke-test-device';
        const agent = request.agent(app);

        await agent.post('/api/auth/register').send(mockUser);

        const loginRes = await request(app)
            .post('/api/auth/login')
            .send({ email: mockUser.email, password: mockUser.password, deviceId, deviceName: 'Test Device' });
        expect(loginRes.statusCode).toBe(200);

        const revokeRes = await agent.post('/api/auth/revoke').send({ deviceId });
        expect(revokeRes.statusCode).toBe(200);

        const secondLoginRes = await request(app)
            .post('/api/auth/login')
            .send({ email: mockUser.email, password: mockUser.password, deviceId, deviceName: 'Test Device' });

        expect(secondLoginRes.statusCode).toBe(403);
        expect(secondLoginRes.body.message).toMatch(/revoked/i);

        const user = await User.findOne({ email: mockUser.email });
        expect(user.authorizedDevices.find((d) => d.deviceId === deviceId)).toBeUndefined();
        expect(user.revokedDevices.find((d) => d.deviceId === deviceId)).toMatchObject({
            deviceId,
            deviceName: 'Test Device'
        });
    });

    it('still allows login from a different, non-revoked device on the same account', async () => {
        const mockUser = generateUser();
        const revokedDeviceId = 'device-a';
        const otherDeviceId = 'device-b';
        const agent = request.agent(app);

        await agent.post('/api/auth/register').send(mockUser);
        await request(app)
            .post('/api/auth/login')
            .send({ email: mockUser.email, password: mockUser.password, deviceId: revokedDeviceId });
        await agent.post('/api/auth/revoke').send({ deviceId: revokedDeviceId });

        const otherLoginRes = await request(app)
            .post('/api/auth/login')
            .send({ email: mockUser.email, password: mockUser.password, deviceId: otherDeviceId });

        expect(otherLoginRes.statusCode).toBe(200);
    });

    it('rejects a refresh token already issued to a device that gets revoked', async () => {
        const mockUser = generateUser();
        const deviceId = 'revoke-refresh-device';
        const agent = request.agent(app);

        await agent.post('/api/auth/register').send(mockUser);

        const loginRes = await request(app)
            .post('/api/auth/login')
            .send({ email: mockUser.email, password: mockUser.password, deviceId });
        const { refreshToken } = loginRes.body.data;
        expect(refreshToken).toEqual(expect.any(String));

        await agent.post('/api/auth/revoke').send({ deviceId });

        const refreshRes = await request(app)
            .post('/api/auth/refresh')
            .send({ refreshToken });

        expect(refreshRes.statusCode).toBe(401);
    });
});

describe('GET /api/auth/revoked-devices and POST /api/auth/reactivate-device', () => {
    const generateUser = () => ({
        firstName: 'John',
        lastName: 'Doe',
        email: `reactivate-${Date.now()}-${Math.random()}@example.com`,
        password: 'Password1'
    });

    it('lists a revoked device and lets it log back in once reactivated', async () => {
        const mockUser = generateUser();
        const deviceId = 'reactivate-test-device';
        const agent = request.agent(app);

        await agent.post('/api/auth/register').send(mockUser);
        await request(app)
            .post('/api/auth/login')
            .send({ email: mockUser.email, password: mockUser.password, deviceId, deviceName: 'Old Phone' });
        await agent.post('/api/auth/revoke').send({ deviceId });

        const listRes = await agent.get('/api/auth/revoked-devices');
        expect(listRes.statusCode).toBe(200);
        expect(listRes.body.data.devices).toHaveLength(1);
        expect(listRes.body.data.devices[0]).toMatchObject({ deviceId, deviceName: 'Old Phone' });

        const blockedLoginRes = await request(app)
            .post('/api/auth/login')
            .send({ email: mockUser.email, password: mockUser.password, deviceId });
        expect(blockedLoginRes.statusCode).toBe(403);

        const reactivateRes = await agent.post('/api/auth/reactivate-device').send({ deviceId });
        expect(reactivateRes.statusCode).toBe(200);

        const emptyListRes = await agent.get('/api/auth/revoked-devices');
        expect(emptyListRes.body.data.devices).toHaveLength(0);

        const reLoginRes = await request(app)
            .post('/api/auth/login')
            .send({ email: mockUser.email, password: mockUser.password, deviceId });
        expect(reLoginRes.statusCode).toBe(200);
    });

    it('returns 404 when reactivating a device that was never revoked', async () => {
        const mockUser = generateUser();
        const agent = request.agent(app);

        await agent.post('/api/auth/register').send(mockUser);

        const res = await agent.post('/api/auth/reactivate-device').send({ deviceId: 'never-revoked' });
        expect(res.statusCode).toBe(404);
    });

    it('requires authentication to list revoked devices', async () => {
        const res = await request(app).get('/api/auth/revoked-devices');
        expect(res.statusCode).toBe(401);
    });
});

describe('Guest sessions and device-management endpoints', () => {
    // A guest (paired-device) session gets a plain object as
    // `req.currentUser`, not a real Mongoose User document — it has no
    // `authorizedDevices`/`revokedDevices` arrays at all. These
    // endpoints must reject guests cleanly rather than crash trying to
    // iterate a field that doesn't exist on that object.
    const guestToken = () => jwt.sign(
        { id: 'guest_test', roomId: 'some-room-id', isGuest: true, scope: 'guest', name: 'Guest Device', jti: 'guest-jti' },
        env.JWT_SECRET,
        { expiresIn: '24h' }
    );

    it('rejects a guest session on GET /api/auth/revoked-devices instead of crashing', async () => {
        const res = await request(app)
            .get('/api/auth/revoked-devices')
            .set('Authorization', `Bearer ${guestToken()}`);

        expect(res.statusCode).toBe(403);
    });

    it('rejects a guest session on POST /api/auth/revoke instead of crashing', async () => {
        const res = await request(app)
            .post('/api/auth/revoke')
            .set('Authorization', `Bearer ${guestToken()}`)
            .send({ deviceId: 'some-device' });

        expect(res.statusCode).toBe(403);
    });

    it('rejects a guest session on POST /api/auth/reactivate-device instead of crashing', async () => {
        const res = await request(app)
            .post('/api/auth/reactivate-device')
            .set('Authorization', `Bearer ${guestToken()}`)
            .send({ deviceId: 'some-device' });

        expect(res.statusCode).toBe(403);
    });
});
