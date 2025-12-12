const authController = require('../controllers/authController');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Mock dependencies
jest.mock('../models/User');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');
jest.mock('crypto');

describe('AuthController', () => {
    let req, res;

    beforeEach(() => {
        req = {
            body: {}
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        jest.clearAllMocks();
    });

    describe('register', () => {
        it('should return 400 if first name contains non-English characters', async () => {
            req.body = { firstName: 'John123', lastName: 'Doe', email: 'test@test.com', password: 'Password1' };
            await authController.register(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: 'First name must contain only English letters' });
        });

        it('should return 400 if last name contains non-English characters', async () => {
            req.body = { firstName: 'John', lastName: 'Doe$', email: 'test@test.com', password: 'Password1' };
            await authController.register(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: 'Last name must contain only English letters' });
        });

        it('should return 400 for weak passwords', async () => {
            const testCases = [
                { pass: 'Pass1', msg: 'Password must be at least 8 characters' },
                { pass: 'password123', msg: 'Password must contain an uppercase letter' },
                { pass: 'PASSWORD123', msg: 'Password must contain a lowercase letter' },
                { pass: 'PasswordTest', msg: 'Password must contain a number' },
            ];

            for (const { pass, msg } of testCases) {
                req.body = { firstName: 'John', lastName: 'Doe', email: 'test@test.com', password: pass };
                await authController.register(req, res);
                expect(res.status).toHaveBeenCalledWith(400);
                expect(res.json).toHaveBeenCalledWith({ message: msg });
                jest.clearAllMocks();
            }
        });

        it('should register user successfully with valid data', async () => {
            req.body = { firstName: 'John', lastName: 'Doe', email: 'test@test.com', password: 'Password1' };

            bcrypt.hash.mockResolvedValue('hashedPassword');
            crypto.randomBytes.mockReturnValue({ toString: () => 'room123' });
            User.prototype.save = jest.fn().mockResolvedValue({ _id: 'userId' });
            jwt.sign.mockReturnValue('token');

            await authController.register(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                token: 'token',
                roomId: 'room123'
            }));
        });
    });
});
