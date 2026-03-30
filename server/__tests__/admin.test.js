/**
 * Preview: server/__tests__/admin.test.js
 * Description: Test suite for ShareAndCopy functionality.
 */

const request = require('supertest');
const bcrypt = require('bcryptjs');
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

describe('Admin Routes', () => {
    let adminToken;
    let userToken;

    beforeEach(async () => {
        
        const hashedPassword = await bcrypt.hash('Password1', 10);
        const adminUser = {
            firstName: 'Admin',
            lastName: 'User',
            email: `admin-${Date.now()}@test.com`,
            password: hashedPassword,
            isAdmin: true,
            roomId: 'admin-room'
        };
        await User.create(adminUser);
        console.log('Admin User Created:', adminUser);

        
        const adminLogin = await request(app).post('/api/auth/login').send({
            email: adminUser.email,
            password: 'Password1'
        });
        if (adminLogin.statusCode !== 200) {
            console.log('Admin Login Failed:', adminLogin.statusCode, JSON.stringify(adminLogin.body));
        }
        adminToken = adminLogin.body.data.token;

        
        const regUser = {
            firstName: 'Reg',
            lastName: 'User',
            email: `reg-${Date.now()}@test.com`,
            password: 'Password1'
        };
        
        const regRes = await request(app).post('/api/auth/register').send(regUser);
        if (regRes.statusCode !== 201) {
            console.log('Admin Test Reg User Failed:', regRes.statusCode, JSON.stringify(regRes.body));
        }
        userToken = regRes.body.data.token;
    });

    describe('GET /api/admin/stats', () => {
        it('should return stats for admin', async () => {
            const res = await request(app)
                .get('/api/admin/stats')
                .set('x-auth-token', adminToken);

            expect(res.statusCode).toBe(200);
            expect(res.body.data).toHaveProperty('guests');
            expect(res.body.data).toHaveProperty('users');
        });

        it('should deny access for regular user', async () => {
            const res = await request(app)
                .get('/api/admin/stats')
                .set('x-auth-token', userToken);

            expect([401, 403]).toContain(res.statusCode);
        });

        it('should deny access for unauthenticated user', async () => {
            const res = await request(app)
                .get('/api/admin/stats');

            expect([401, 403]).toContain(res.statusCode);
        });
    });
});
