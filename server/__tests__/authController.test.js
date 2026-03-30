/**
 * Preview: server/__tests__/authController.test.js
 * Description: Test suite for ShareAndCopy functionality.
 */

const authController = require('../src/controllers/authController');
const authService = require('../src/services/authService');
const responseHandler = require('../src/utils/responseHandler');


jest.mock('../src/services/authService');

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
        
        

        it('should register user successfully with valid data', async () => {
            req.body = { firstName: 'John', lastName: 'Doe', email: 'test@test.com', password: 'Password1' };

            const mockResult = {
                token: 'token',
                roomId: 'room123',
                user: { id: 'userId', email: 'test@test.com' }
            };

            authService.register.mockResolvedValue(mockResult);

            await authController.register(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                data: mockResult
            }));
        });

        it('should return 400 if email already exists', async () => {
            req.body = { firstName: 'John', lastName: 'Doe', email: 'test@test.com', password: 'Password1' };
            authService.register.mockRejectedValue(new Error('Email already exists'));

            await authController.register(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                message: 'Email already exists'
            }));
        });

        it('should return 500 for generic errors', async () => {
            req.body = { firstName: 'John', lastName: 'Doe', email: 'test@test.com', password: 'Password1' };
            authService.register.mockRejectedValue(new Error('Database error'));

            await authController.register(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
        });
    });
});
