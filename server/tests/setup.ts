/**
 * @file setup.ts
 * @description Test setup file that runs before all tests
 */

// Import Jest globals
import { jest, beforeAll, afterAll } from '@jest/globals';

// Set test environment
process.env.NODE_ENV = 'test';
process.env.PORT = '5002'; // Use a different port for tests
process.env.DATABASE_URL = 'postgres://test:test@localhost:5432/test_db';
process.env.SESSION_SECRET = 'test-session-secret';
process.env.COOKIE_SECRET = 'test-cookie-secret';

// Mock external services if needed
jest.mock('../services/openai', () => ({
  generateAIResponse: jest.fn().mockResolvedValue('Mocked AI response'),
}));

// Global setup
beforeAll(() => {
  console.log('Starting test suite in test environment');
});

// Global teardown
afterAll(() => {
  console.log('Test suite completed');
});

// Timeout settings for tests
jest.setTimeout(30000); // 30 seconds timeout for all tests 