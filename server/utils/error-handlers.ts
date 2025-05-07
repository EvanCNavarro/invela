/**
 * Error Handler Utilities
 * 
 * Standard error handling functions for API endpoints to ensure consistent
 * error responses throughout the application.
 */

import { Response } from 'express';
import { logger } from './logger';

// Standard API error response format
interface ErrorResponse {
  success: false;
  error: string;
  details?: string;
  code?: string;
  status?: number;
}

/**
 * Handles API errors with proper logging and consistent response format
 * 
 * @param res Express response object
 * @param message User-friendly error message
 * @param error Original error object
 * @param status HTTP status code (defaults to 500)
 * @returns Express response with formatted error
 */
export function handleErrorResponse(
  res: Response, 
  message: string, 
  error?: any, 
  status: number = 500
): Response {
  // Create error context for logging
  const errorContext = {
    service: 'API',
    endpoint: res.req.url,
    method: res.req.method,
    status,
    error: error instanceof Error ? error.message : String(error || 'Unknown error'),
    stack: error instanceof Error ? error.stack : undefined
  };
  
  // Log the error with context
  logger.error(`API Error: ${message}`, errorContext);
  
  // Format the response
  const errorResponse: ErrorResponse = {
    success: false,
    error: message,
    status
  };
  
  // Add original error details in development or if error is not sensitive
  if (process.env.NODE_ENV !== 'production' && error) {
    errorResponse.details = error instanceof Error ? 
      error.message : 
      typeof error === 'object' ? 
        JSON.stringify(error) : 
        String(error);
  }
  
  // Add error code if available
  if (error && 'code' in error) {
    errorResponse.code = error.code;
  }
  
  return res.status(status).json(errorResponse);
}

/**
 * Handle validation errors specifically
 * 
 * @param res Express response object
 * @param validationErrors Validation error details
 * @returns Express response with formatted validation errors
 */
export function handleValidationErrors(
  res: Response,
  validationErrors: Record<string, string>
): Response {
  logger.warn('Validation Error', { 
    service: 'API', 
    endpoint: res.req.url, 
    errors: validationErrors 
  });
  
  return res.status(400).json({
    success: false,
    error: 'Validation failed',
    validationErrors
  });
}

/**
 * Handle not found errors
 * 
 * @param res Express response object
 * @param resourceType Type of resource that wasn't found
 * @param id Identifier that was searched for
 * @returns Express response with not found error
 */
export function handleNotFoundError(
  res: Response,
  resourceType: string,
  id?: string | number
): Response {
  const message = id ? 
    `${resourceType} with ID ${id} not found` : 
    `${resourceType} not found`;
  
  logger.info(`Not Found: ${message}`, { 
    service: 'API', 
    endpoint: res.req.url 
  });
  
  return res.status(404).json({
    success: false,
    error: message
  });
}

/**
 * Handle unauthorized access errors
 * 
 * @param res Express response object
 * @param message Custom unauthorized message
 * @returns Express response with unauthorized error
 */
export function handleUnauthorizedError(
  res: Response,
  message: string = 'Unauthorized access'
): Response {
  logger.warn(`Unauthorized: ${message}`, { 
    service: 'API', 
    endpoint: res.req.url 
  });
  
  return res.status(401).json({
    success: false,
    error: message
  });
}