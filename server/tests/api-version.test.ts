/**
 * @file api-version.test.ts
 * @description Tests for API versioning middleware
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { Request, Response } from 'express';
import { apiVersionMiddleware, ApiVersionOptions } from '../middleware/api-version';

describe('API Versioning Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: jest.Mock;
  
  beforeEach(() => {
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
  
  test('should use default version when no version specified', () => {
    const versionMiddleware = apiVersionMiddleware({
      defaultVersion: 'v1',
      supportedVersions: ['v1']
    });
    
    versionMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);
    
    expect(mockRequest.apiVersion).toBe('v1');
    expect(mockResponse.setHeader).toHaveBeenCalledWith('X-API-Version', 'v1');
    expect(nextFunction).toHaveBeenCalled();
  });
  
  test('should extract version from URL path', () => {
    mockRequest.path = '/api/v2/users';
    
    const versionMiddleware = apiVersionMiddleware({
      defaultVersion: 'v1',
      supportedVersions: ['v1', 'v2']
    });
    
    versionMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);
    
    expect(mockRequest.apiVersion).toBe('v2');
    expect(mockResponse.setHeader).toHaveBeenCalledWith('X-API-Version', 'v2');
    expect(nextFunction).toHaveBeenCalled();
  });
  
  test('should extract version from Accept header', () => {
    (mockRequest.get as jest.Mock).mockImplementation((header: string) => {
      if (header === 'Accept') {
        return 'application/vnd.company.v2+json';
      }
      return null;
    });
    
    const versionMiddleware = apiVersionMiddleware({
      defaultVersion: 'v1',
      supportedVersions: ['v1', 'v2']
    });
    
    versionMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);
    
    expect(mockRequest.apiVersion).toBe('v2');
    expect(mockResponse.setHeader).toHaveBeenCalledWith('X-API-Version', 'v2');
    expect(nextFunction).toHaveBeenCalled();
  });
  
  test('should extract version from X-API-Version header', () => {
    (mockRequest.get as jest.Mock).mockImplementation((header: string) => {
      if (header === 'X-API-Version') {
        return 'v2';
      }
      return null;
    });
    
    const versionMiddleware = apiVersionMiddleware({
      defaultVersion: 'v1',
      supportedVersions: ['v1', 'v2']
    });
    
    versionMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);
    
    expect(mockRequest.apiVersion).toBe('v2');
    expect(mockResponse.setHeader).toHaveBeenCalledWith('X-API-Version', 'v2');
    expect(nextFunction).toHaveBeenCalled();
  });
  
  test('should extract version from query parameter', () => {
    mockRequest.query = { 'api-version': 'v2' };
    
    const versionMiddleware = apiVersionMiddleware({
      defaultVersion: 'v1',
      supportedVersions: ['v1', 'v2']
    });
    
    versionMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);
    
    expect(mockRequest.apiVersion).toBe('v2');
    expect(mockResponse.setHeader).toHaveBeenCalledWith('X-API-Version', 'v2');
    expect(nextFunction).toHaveBeenCalled();
  });
  
  test('should return 400 error for unsupported version', () => {
    mockRequest.path = '/api/v3/users';
    
    const versionMiddleware = apiVersionMiddleware({
      defaultVersion: 'v1',
      supportedVersions: ['v1', 'v2']
    });
    
    versionMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);
    
    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
      error: 'Unsupported API version',
      code: 'UNSUPPORTED_API_VERSION'
    }));
    expect(nextFunction).not.toHaveBeenCalled();
  });
}); 