"use strict";
/**
 * @file api-version.test.ts
 * @description Tests for API versioning middleware
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const api_version_1 = require("../middleware/api-version");
(0, globals_1.describe)('API Versioning Middleware', () => {
    let mockRequest;
    let mockResponse;
    let nextFunction;
    (0, globals_1.beforeEach)(() => {
        mockRequest = {
            path: '/api/users',
            get: jest.fn(),
            query: {}
        };
        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
            setHeader: jest.fn()
        };
        nextFunction = jest.fn();
    });
    (0, globals_1.test)('should use default version when no version specified', () => {
        const versionMiddleware = (0, api_version_1.apiVersionMiddleware)({
            defaultVersion: 'v1',
            supportedVersions: ['v1']
        });
        versionMiddleware(mockRequest, mockResponse, nextFunction);
        (0, globals_1.expect)(mockRequest.apiVersion).toBe('v1');
        (0, globals_1.expect)(mockResponse.setHeader).toHaveBeenCalledWith('X-API-Version', 'v1');
        (0, globals_1.expect)(nextFunction).toHaveBeenCalled();
    });
    (0, globals_1.test)('should extract version from URL path', () => {
        mockRequest.path = '/api/v2/users';
        const versionMiddleware = (0, api_version_1.apiVersionMiddleware)({
            defaultVersion: 'v1',
            supportedVersions: ['v1', 'v2']
        });
        versionMiddleware(mockRequest, mockResponse, nextFunction);
        (0, globals_1.expect)(mockRequest.apiVersion).toBe('v2');
        (0, globals_1.expect)(mockResponse.setHeader).toHaveBeenCalledWith('X-API-Version', 'v2');
        (0, globals_1.expect)(nextFunction).toHaveBeenCalled();
    });
    (0, globals_1.test)('should extract version from Accept header', () => {
        mockRequest.get.mockImplementation((header) => {
            if (header === 'Accept') {
                return 'application/vnd.company.v2+json';
            }
            return null;
        });
        const versionMiddleware = (0, api_version_1.apiVersionMiddleware)({
            defaultVersion: 'v1',
            supportedVersions: ['v1', 'v2']
        });
        versionMiddleware(mockRequest, mockResponse, nextFunction);
        (0, globals_1.expect)(mockRequest.apiVersion).toBe('v2');
        (0, globals_1.expect)(mockResponse.setHeader).toHaveBeenCalledWith('X-API-Version', 'v2');
        (0, globals_1.expect)(nextFunction).toHaveBeenCalled();
    });
    (0, globals_1.test)('should extract version from X-API-Version header', () => {
        mockRequest.get.mockImplementation((header) => {
            if (header === 'X-API-Version') {
                return 'v2';
            }
            return null;
        });
        const versionMiddleware = (0, api_version_1.apiVersionMiddleware)({
            defaultVersion: 'v1',
            supportedVersions: ['v1', 'v2']
        });
        versionMiddleware(mockRequest, mockResponse, nextFunction);
        (0, globals_1.expect)(mockRequest.apiVersion).toBe('v2');
        (0, globals_1.expect)(mockResponse.setHeader).toHaveBeenCalledWith('X-API-Version', 'v2');
        (0, globals_1.expect)(nextFunction).toHaveBeenCalled();
    });
    (0, globals_1.test)('should extract version from query parameter', () => {
        mockRequest.query = { 'api-version': 'v2' };
        const versionMiddleware = (0, api_version_1.apiVersionMiddleware)({
            defaultVersion: 'v1',
            supportedVersions: ['v1', 'v2']
        });
        versionMiddleware(mockRequest, mockResponse, nextFunction);
        (0, globals_1.expect)(mockRequest.apiVersion).toBe('v2');
        (0, globals_1.expect)(mockResponse.setHeader).toHaveBeenCalledWith('X-API-Version', 'v2');
        (0, globals_1.expect)(nextFunction).toHaveBeenCalled();
    });
    (0, globals_1.test)('should return 400 error for unsupported version', () => {
        mockRequest.path = '/api/v3/users';
        const versionMiddleware = (0, api_version_1.apiVersionMiddleware)({
            defaultVersion: 'v1',
            supportedVersions: ['v1', 'v2']
        });
        versionMiddleware(mockRequest, mockResponse, nextFunction);
        (0, globals_1.expect)(mockResponse.status).toHaveBeenCalledWith(400);
        (0, globals_1.expect)(mockResponse.json).toHaveBeenCalledWith(globals_1.expect.objectContaining({
            error: 'Unsupported API version',
            code: 'UNSUPPORTED_API_VERSION'
        }));
        (0, globals_1.expect)(nextFunction).not.toHaveBeenCalled();
    });
});
