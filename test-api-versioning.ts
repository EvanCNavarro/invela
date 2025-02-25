/**
 * Simple test script for API versioning middleware
 */
import { Request, Response, NextFunction } from 'express';
import { apiVersionMiddleware } from './server/middleware/api-version';

// Mock request objects for testing
const mockRequests = [
  { path: '/api/users', headers: {}, query: {} }, // Default version
  { path: '/api/v2/users', headers: {}, query: {} }, // URL path versioning
  { path: '/api/users', headers: { 'Accept': 'application/vnd.company.v2+json' }, query: {} }, // Accept header
  { path: '/api/users', headers: { 'X-API-Version': 'v2' }, query: {} }, // Custom header
  { path: '/api/users', headers: {}, query: { 'api-version': 'v2' } }, // Query parameter
  { path: '/api/v3/users', headers: {}, query: {} }, // Unsupported version
];

// Create middleware instance
const middleware = apiVersionMiddleware({
  defaultVersion: 'v1',
  supportedVersions: ['v1', 'v2']
});

// Test each request
mockRequests.forEach((mockReq, index) => {
  console.log(`\nTest Case ${index + 1}:`);
  console.log(`Path: ${mockReq.path}`);
  console.log(`Headers: ${JSON.stringify(mockReq.headers)}`);
  console.log(`Query: ${JSON.stringify(mockReq.query)}`);
  
  // Create request object
  const req = {
    path: mockReq.path,
    get: (header: string) => mockReq.headers[header.toLowerCase()],
    query: mockReq.query
  } as unknown as Request;
  
  // Create response object
  const res = {
    status: (code: number) => {
      console.log(`Response Status: ${code}`);
      return res;
    },
    json: (body: any) => {
      console.log(`Response Body: ${JSON.stringify(body)}`);
      return res;
    },
    setHeader: (name: string, value: string) => {
      console.log(`Set Header: ${name}=${value}`);
    }
  } as unknown as Response;
  
  // Create next function
  const next = () => {
    console.log('Next function called');
    console.log(`API Version: ${req.apiVersion}`);
  };
  
  // Run middleware
  middleware(req, res, next as NextFunction);
  console.log('---');
});

console.log('API Versioning Tests Completed'); 