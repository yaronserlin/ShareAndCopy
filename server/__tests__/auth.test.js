/**
 * Preview: server/__tests__/auth.test.js
 * Description: Test suite for ShareAndCopy functionality.
 */

const request = require('supertest');




const app = require('../src/index');
const testDb = require('./testDb');
const User = require('../src/models/User');

beforeAll(async () => {
    await testDb.connect();
}, 30000);

afterEach(async () => {
    await testDb.clear();
});

afterAll(async () => {
    await testDb.close();
});

describe('register validation schema', () => {
    const { registerSchema } = require('../src/utils/validationSchemas');

    it('should require terms acceptance', () => {
        const valid = {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            password: 'Password1',
            termsAccepted: true
        };
        expect(registerSchema.validate(valid).error).toBeUndefined();
        const { termsAccepted, ...withoutConsent } = valid;
        expect(registerSchema.validate(withoutConsent).error).toBeDefined();
        expect(registerSchema.validate({ ...valid, termsAccepted: false }).error).toBeDefined();
    });
});

describe('Auth Routes', () => {
    const generateUser = () => ({
        firstName: 'John',
        lastName: 'Doe',
        email: `john-${Date.now()}-${Math.random()}@example.com`,
        password: 'Password1',
        termsAccepted: true
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

            const savedUser = await User.findOne({ email: mockUser.email });
            expect(savedUser.termsVersion).toBe('1.0');
            expect(savedUser.termsAcceptedAt).toBeTruthy();
            expect(res.headers['set-cookie']).toBeDefined();
            expect(res.body.data).not.toHaveProperty('token');
            expect(res.body.data).toHaveProperty('roomId');

            const user = await User.findOne({ email: mockUser.email });
            expect(user).toBeTruthy();
        });

        it('should not register user with existing email', async () => {
            const mockUser = generateUser();
            await User.create({ ...mockUser, roomId: 'existing-room' }); 

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

            expect(res.statusCode).toBe(400); 
        });
    });

    describe('POST /api/auth/login', () => {
        let mockUser;
        beforeEach(async () => {
            mockUser = generateUser();
            
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
            expect(res.headers['set-cookie']).toBeDefined();
            expect(res.body.data).not.toHaveProperty('token');
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
            const agent = request.agent(app);

            const regRes = await agent
                .post('/api/auth/register')
                .send(mockUser);

            if (regRes.statusCode !== 201) {
                console.log('Register failed:', regRes.statusCode, regRes.body);
            }

            const res = await agent.get('/api/auth/verify');

            expect(res.statusCode).toBe(200);
            expect(res.body.data.user.email).toBe(mockUser.email);
            expect(res.body.data).not.toHaveProperty('password');
        });

        it('should return 401/403 for unauthenticated request', async () => {
            const res = await request(app).get('/api/auth/verify');
            expect([401, 403]).toContain(res.statusCode);
        });
    });

    describe('POST /api/auth/pairing-code', () => {
        it('should issue a pairing code for an authenticated user', async () => {
            const mockUser = generateUser();
            const agent = request.agent(app);
            await agent.post('/api/auth/register').send(mockUser);

            const res = await agent.post('/api/auth/pairing-code');

            expect(res.statusCode).toBe(200);
            expect(res.body.data.code).toMatch(/^[0-9A-F]{6}$/);
            expect(res.body.data.pairingToken).toEqual(expect.any(String));
            expect(res.body.data.expiresIn).toBe(60 * 5);
        });

        it('should return 401 for unauthenticated request', async () => {
            const res = await request(app).post('/api/auth/pairing-code');
            expect(res.statusCode).toBe(401);
        });
    });

    describe('POST /api/auth/verify-pairing', () => {
        it('should exchange a valid pairing code for a pairing token', async () => {
            const mockUser = generateUser();
            const agent = request.agent(app);
            await agent.post('/api/auth/register').send(mockUser);
            const { body: { data: { code } } } = await agent.post('/api/auth/pairing-code');

            const res = await request(app)
                .post('/api/auth/verify-pairing')
                .send({ code });

            expect(res.statusCode).toBe(200);
            expect(res.body.data.valid).toBe(true);
            expect(res.body.data.pairingToken).toEqual(expect.any(String));
        });

        it('should reject an invalid or expired code', async () => {
            const res = await request(app)
                .post('/api/auth/verify-pairing')
                .send({ code: 'NOTREAL' });

            expect(res.statusCode).toBe(400);
            expect(res.body.success).toBe(false);
        });

        it('should not allow the same code to be consumed twice', async () => {
            const mockUser = generateUser();
            const agent = request.agent(app);
            await agent.post('/api/auth/register').send(mockUser);
            const { body: { data: { code } } } = await agent.post('/api/auth/pairing-code');

            await request(app).post('/api/auth/verify-pairing').send({ code });
            const res = await request(app).post('/api/auth/verify-pairing').send({ code });

            expect(res.statusCode).toBe(400);
        });
    });

    describe('POST /api/auth/refresh', () => {
        it('should issue a new access token when a valid refresh cookie is present', async () => {
            const mockUser = generateUser();
            const agent = request.agent(app);
            await agent.post('/api/auth/register').send(mockUser);

            const res = await agent.post('/api/auth/refresh');

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.headers['set-cookie']).toBeDefined();

            const verifyRes = await agent.get('/api/auth/verify');
            expect(verifyRes.statusCode).toBe(200);
        });

        it('should return 400 when no refresh cookie is present', async () => {
            const res = await request(app).post('/api/auth/refresh');
            expect(res.statusCode).toBe(400);
        });

        it('should return 401 for an invalid refresh token', async () => {
            const res = await request(app)
                .post('/api/auth/refresh')
                .set('Cookie', ['refreshToken=not-a-real-token']);

            expect(res.statusCode).toBe(401);
        });
    });
});
