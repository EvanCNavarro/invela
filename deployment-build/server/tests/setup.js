"use strict";
/**
 * @file setup.ts
 * @description Test setup file that runs before all tests
 */
Object.defineProperty(exports, "__esModule", { value: true });
// Import Jest globals
const globals_1 = require("@jest/globals");
// Set test environment
process.env.NODE_ENV = 'test';
process.env.PORT = '5002'; // Use a different port for tests
process.env.DATABASE_URL = 'postgres://test:test@localhost:5432/test_db';
process.env.SESSION_SECRET = 'test-session-secret';
process.env.COOKIE_SECRET = 'test-cookie-secret';
// Mock external services if needed
globals_1.jest.mock('../services/openai', () => ({
    generateAIResponse: globals_1.jest.fn().mockResolvedValue('Mocked AI response'),
}));
// Global setup
(0, globals_1.beforeAll)(() => {
    console.log('Starting test suite in test environment');
});
// Global teardown
(0, globals_1.afterAll)(() => {
    console.log('Test suite completed');
});
// Timeout settings for tests
globals_1.jest.setTimeout(30000); // 30 seconds timeout for all tests 
