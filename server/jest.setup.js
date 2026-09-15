/**
 * Test environment defaults.
 *
 * The server refuses to boot without its required environment variables
 * (see `src/config/env.js`), which otherwise makes `npm test` depend on
 * a developer's local `.env`. These are filled in only when absent, so a
 * real environment still wins.
 */

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/shareandcopy-test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-jwt-refresh-secret';
