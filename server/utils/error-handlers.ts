/**
 * Error Handlers Utility
 * 
 * This module provides standardized error handling functions for API responses,
 * ensuring consistent error formats across the application.
 * 
 * Features:
 * - Standardized error response format
 * - Detailed logging for all errors
 * - Different error types with proper HTTP status codes
 * - Centralized error handling patterns for reuse
 */

import { Response } from 'express';
import { logger } from './logger';

const errorLogger = logger.child({ module: 'ErrorHandlers' });

/**
 * Handle a generic error response
 * 
 * @param res Express response object
 * @param message User-friendly error message
 * @param error Error object or string
 * @param statusCode HTTP status code (default: 500)
 * @returns The response object with error details
 */
export function handleErrorResponse(
  res: Response, 
  message: string, 
  error: Error | string,
  statusCode = 500
): Response {
  // Extract error details
  const errorMessage = error instanceof Error ? error.message : error;
  const errorStack = error instanceof Error ? error.stack : undefined;
  
  // Log the error with details
  errorLogger.error(`API Error: ${message}`, {
    errorMessage,
    statusCode,
    stack: errorStack,
    path: res.req?.path || 'unknown',
    method: res.req?.method || 'unknown',
    timestamp: new Date().toISOString()
  });
  
  // Return standardized error response
  return res.status(statusCode).json({
    success: false,
    error: message,
    details: errorMessage,
    statusCode
  });
}

/**
 * Handle a validation error (bad request)
 * 
 * @param res Express response object
 * @param message User-friendly error message
 * @param details Detailed validation errors
 * @returns The response object with validation error details
 */
export function handleValidationError(
  res: Response, 
  message: string, 
  details: Record<string, string> | string
): Response {
  // Log the validation error
  errorLogger.warn(`Validation Error: ${message}`, {
    details,
    path: res.req?.path || 'unknown',
    method: res.req?.method || 'unknown'
  });
  
  // Return standardized validation error response
  return res.status(400).json({
    success: false,
    error: message,
    validationErrors: details,
    statusCode: 400
  });
}

/**
 * Handle a not found error
 * 
 * @param res Express response object
 * @param resourceType Type of resource that was not found
 * @param resourceId ID of the resource that was not found
 * @returns The response object with not found error details
 */
export function handleNotFoundError(
  res: Response, 
  resourceType: string, 
  resourceId: number | string
): Response {
  const message = `${resourceType} not found: ${resourceId}`;
  
  // Log the not found error
  errorLogger.warn(`Not Found: ${message}`, {
    resourceType,
    resourceId,
    path: res.req?.path || 'unknown',
    method: res.req?.method || 'unknown'
  });
  
  // Return standardized not found error response
  return res.status(404).json({
    success: false,
    error: message,
    statusCode: 404
  });
}

/**
 * Handle an unauthorized error
 * 
 * @param res Express response object
 * @param message User-friendly error message
 * @returns The response object with unauthorized error details
 */
export function handleUnauthorizedError(
  res: Response, 
  message = 'Unauthorized access'
): Response {
  // Log the unauthorized error
  errorLogger.warn(`Unauthorized: ${message}`, {
    path: res.req?.path || 'unknown',
    method: res.req?.method || 'unknown',
    user: res.req?.user?.id || 'unknown'
  });
  
  // Return standardized unauthorized error response
  return res.status(401).json({
    success: false,
    error: message,
    statusCode: 401
  });
}

/**
 * Handle a forbidden error
 * 
 * @param res Express response object
 * @param message User-friendly error message
 * @returns The response object with forbidden error details
 */
export function handleForbiddenError(
  res: Response, 
  message = 'Access forbidden'
): Response {
  // Log the forbidden error
  errorLogger.warn(`Forbidden: ${message}`, {
    path: res.req?.path || 'unknown',
    method: res.req?.method || 'unknown',
    user: res.req?.user?.id || 'unknown'
  });
  
  // Return standardized forbidden error response
  return res.status(403).json({
    success: false,
    error: message,
    statusCode: 403
  });
}

/**
 * Handle a conflict error
 * 
 * @param res Express response object
 * @param message User-friendly error message
 * @param details Additional details about the conflict
 * @returns The response object with conflict error details
 */
export function handleConflictError(
  res: Response, 
  message: string,
  details?: string
): Response {
  // Log the conflict error
  errorLogger.warn(`Conflict: ${message}`, {
    details,
    path: res.req?.path || 'unknown',
    method: res.req?.method || 'unknown'
  });
  
  // Return standardized conflict error response
  return res.status(409).json({
    success: false,
    error: message,
    details,
    statusCode: 409
  });
}