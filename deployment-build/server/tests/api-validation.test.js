"use strict";
/**
 * @file api-validation.test.ts
 * @description Tests to validate API endpoints against Swagger documentation.
 *
 * This file contains tests that verify:
 * 1. All documented endpoints exist and are properly configured
 * 2. Response formats match the documented schemas
 * 3. Required parameters are properly validated
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const supertest_1 = __importDefault(require("supertest"));
const swagger_1 = require("../utils/swagger");
const test_helpers_1 = require("./test-helpers");
// Helper function to extract path and method from an OpenAPI path
function getPathsFromSpec(spec) {
    const paths = [];
    Object.entries(spec.paths || {}).forEach(([path, pathItem]) => {
        Object.entries(pathItem).forEach(([method, _]) => {
            // Skip non-HTTP methods
            if (['get', 'post', 'put', 'delete', 'patch'].includes(method.toLowerCase())) {
                paths.push({
                    path: path.replace(/{(\w+)}/g, ':$1'), // Convert OpenAPI path params to Express format
                    method: method.toLowerCase()
                });
            }
        });
    });
    return paths;
}
(0, globals_1.describe)('API Validation Tests', () => {
    let app;
    let request;
    (0, globals_1.beforeAll)(async () => {
        app = await (0, test_helpers_1.createTestApp)();
        request = (0, supertest_1.default)(app);
    });
    (0, globals_1.describe)('Endpoint existence validation', () => {
        const paths = getPathsFromSpec(swagger_1.swaggerSpec);
        globals_1.test.each(paths)('$method $path should exist', async ({ path, method }) => {
            // For this test, we don't care about valid responses, just that the route exists
            const response = await request[method](path)
                .set('Accept', 'application/json');
            // Routes should respond with something other than 404
            // They might return 401 (unauthorized) or other statuses, but not 404 (not found)
            (0, globals_1.expect)(response.status).not.toBe(404);
        });
    });
    // Add more tests for specific endpoints with authentication
    (0, globals_1.describe)('Authenticated endpoints', () => {
        (0, globals_1.test)('GET /files should require authentication', async () => {
            const response = await request.get('/files')
                .set('Accept', 'application/json');
            (0, globals_1.expect)(response.status).toBe(401);
        });
        (0, globals_1.test)('POST /users/invite should require authentication', async () => {
            const response = await request.post('/users/invite')
                .set('Accept', 'application/json')
                .send({});
            (0, globals_1.expect)(response.status).toBe(401);
        });
    });
    // Test schema validation for key endpoints
    (0, globals_1.describe)('Schema validation', () => {
        (0, globals_1.test)('POST /auth/login schema validation', async () => {
            const response = await request.post('/auth/login')
                .set('Accept', 'application/json')
                .send({
            // Missing required fields to test validation
            });
            (0, globals_1.expect)(response.status).toBe(400); // Should be a bad request
        });
    });
});
/**
 * Note: This is a basic implementation. A comprehensive test suite would:
 *
 * 1. Log in and acquire tokens to test authenticated endpoints
 * 2. Validate all response schemas match Swagger definitions
 * 3. Test parameter validations for query params, path params, etc.
 * 4. Test file uploads
 * 5. Check rate limiting behavior
 *
 * Consider expanding this as you implement more features.
 */ 
