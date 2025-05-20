"use strict";
/**
 * @file test-helpers.ts
 * @description Helper functions for API testing
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTestApp = createTestApp;
exports.getTestAuthToken = getTestAuthToken;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const body_parser_1 = __importDefault(require("body-parser"));
const env_1 = require("../utils/env");
const swagger_1 = require("../utils/swagger");
const auth_1 = __importDefault(require("../routes/auth"));
const users_1 = __importDefault(require("../routes/users"));
const tasks_1 = __importDefault(require("../routes/tasks"));
const files_1 = __importDefault(require("../routes/files"));
const error_1 = require("../middleware/error");
/**
 * Creates a test Express application with all routes configured
 * but database mocked for testing purposes
 */
async function createTestApp() {
    const app = (0, express_1.default)();
    // Standard middleware
    app.use((0, cors_1.default)());
    app.use((0, cookie_parser_1.default)(env_1.env.COOKIE_SECRET));
    app.use(body_parser_1.default.json());
    app.use(body_parser_1.default.urlencoded({ extended: true }));
    // Setup Swagger
    (0, swagger_1.setupSwagger)(app);
    // Setup routes
    app.use('/auth', auth_1.default);
    app.use('/users', users_1.default);
    app.use('/tasks', tasks_1.default);
    app.use('/files', files_1.default);
    // Error handling middleware
    app.use(error_1.errorHandler);
    return app;
}
/**
 * Helper to generate a valid authentication token for testing
 * authenticated endpoints
 */
function getTestAuthToken(userId = '1') {
    // This would normally use your actual token generation logic
    // For tests, you can create a simplified version or use a mock
    return 'test-auth-token';
}
