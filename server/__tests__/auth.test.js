const request = require('supertest');

// Mock cron - REMOVED


const app = require('../src/index'); // Adjust path as needed
const testDb = require('./testDb');
const User = require('../src/models/User');

beforeAll(async () => {
    await testDb.connect();
}, 30000); // Increase timeout for MongoMemoryServer

afterEach(async () => {
    await testDb.clear();
});

afterAll(async () => {
    await testDb.close();
});

describe('Auth Routes', () => {
    const generateUser = () => ({
        firstName: 'John',
        lastName: 'Doe',
        email: `john-${Date.now()}-${Math.random()}@example.com`,
        password: 'Password1'
    });

    describe('POST /api/auth/register', () => {
        it('should register a new user', async () => {
            const mockUser = generateUser();
            const res = await request(app)
                .post('/api/auth/register')
                .send(mockUser);

            if (res.statusCode !== 201) {
                console.log('Reg new user failed:', res.statusCode, JSON.stringify(res.body));
            }

            if (res.statusCode !== 201) {
                console.log('Register failed:', res.statusCode, res.body);
            }

            expect(res.statusCode).toBe(201);
            expect(res.body.data).toHaveProperty('token');
            expect(res.body.data).toHaveProperty('roomId');

            const user = await User.findOne({ email: mockUser.email });
            expect(user).toBeTruthy();
        });

        it('should not register user with existing email', async () => {
            const mockUser = generateUser();
            await User.create({ ...mockUser, roomId: 'existing-room' }); // Create user first

            const res = await request(app)
                .post('/api/auth/register')
                .send(mockUser);

            expect(res.statusCode).toBe(400);
            expect(res.body.message).toMatch(/exists/i);
        });

        it('should validate input', async () => {
            const mockUser = generateUser();
            const res = await request(app)
                .post('/api/auth/register')
                .send({ ...mockUser, email: 'invalid-email' });

            expect(res.statusCode).toBe(400); // Or whatever validation error code is used
        });
    });

    describe('POST /api/auth/login', () => {
        let mockUser;
        beforeEach(async () => {
            mockUser = generateUser();
            // Register a user before login tests
            const regRes = await request(app).post('/api/auth/register').send(mockUser);
            if (regRes.statusCode !== 201) {
                console.log('Auth Test Setup Reg Failed:', regRes.statusCode, JSON.stringify(regRes.body));
            }
        });

        it('should login with valid credentials', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: mockUser.email,
                    password: mockUser.password
                });

            expect(res.statusCode).toBe(200);
            expect(res.body.data).toHaveProperty('token');
        });

        it('should return 400 for invalid credentials', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: mockUser.email,
                    password: 'WrongPassword'
                });

            expect(res.statusCode).toBe(401);
        });
    });

    describe('GET /api/auth/verify', () => {
        it('should return user data for authenticated user', async () => {
            const mockUser = generateUser();
            // Register and get token
            const regRes = await request(app)
                .post('/api/auth/register')
                .send(mockUser);

            if (regRes.statusCode !== 201) {
                console.log('Register failed:', regRes.statusCode, regRes.body);
            }
            const token = regRes.body.data.token || 'dummy';

            const res = await request(app)
                .get('/api/auth/verify')
                .set('x-auth-token', token);

            expect(res.statusCode).toBe(200);
            expect(res.body.data.user.email).toBe(mockUser.email);
            expect(res.body.data).not.toHaveProperty('password');
        });

        it('should return 401/403 for unauthenticated request', async () => {
            const res = await request(app).get('/api/auth/verify');
            expect([401, 403]).toContain(res.statusCode);
        });
    });
});
