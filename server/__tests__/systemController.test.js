const request = require('supertest');
const app = require('../src/index');
const systemService = require('../src/services/systemService');

// Mock systemService
jest.mock('../src/services/systemService');

describe('System Routes', () => {
    describe('GET /api/system/ip', () => {
        it('should return server IP', async () => {
            systemService.getServerIp.mockReturnValue('192.168.1.10');

            const res = await request(app).get('/api/system/ip');

            expect(res.statusCode).toBe(200);
            expect(res.body.data.ip).toBe('192.168.1.10');
        });

        it('should return 404 if IP not found', async () => {
            systemService.getServerIp.mockReturnValue(null);

            const res = await request(app).get('/api/system/ip');

            expect(res.statusCode).toBe(404);
            expect(res.body.message).toMatch(/not found/i);
        });

        it('should handle errors', async () => {
            systemService.getServerIp.mockImplementation(() => {
                throw new Error('System error');
            });

            const res = await request(app).get('/api/system/ip');

            expect(res.statusCode).toBe(500);
        });
    });
});
