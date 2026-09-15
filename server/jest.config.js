/**
 * Jest configuration: loads test environment defaults before any module
 * (and therefore `src/config/env.js`) is imported.
 */

module.exports = {
    testEnvironment: 'node',
    setupFiles: ['<rootDir>/jest.setup.js'],
    testPathIgnorePatterns: ['/node_modules/', '<rootDir>/__tests__/testDb.js']
};
