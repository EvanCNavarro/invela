/**
 * @file error.ts
 * @description Global error handling middleware for Express.
 * Provides consistent error responses across all API endpoints.
 */

import { Request, Response, NextFunction } from 'express';
import { AppError } from '@shared/utils/errors';
import { fromZodError } from 'zod-validation-error';
import { ZodError } from 'zod';

/**
 * Global error handling middleware.
 * Catches all errors thrown in route handlers and formats them into consistent responses.
 * 
 * @param err - The error object thrown in the request pipeline
 * @param req - The Express request object
 * @param res - The Express response object
 * @param next - The Express next function
 */
export function errorHandler(
  err: Error, 
  req: Request, 
  res: Response, 
  next: NextFunction
) {
  // Log all errors for debugging and monitoring
  console.error(`[Error] ${req.method} ${req.path}:`, err);
  
  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const validationError = fromZodError(err);
    return res.status(400).json({
      status: 400,
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: validationError.details,
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method
    });
  }
  
  // Handle known application errors
  if (err instanceof AppError) {
    return res.status(err.status).json({
      status: err.status,
      message: err.message,
      code: err.code,
      details: err.details,
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method
    });
  }
  
  // Handle unknown errors
  const isProduction = process.env.NODE_ENV === 'production';
  const status = 500;
  
  return res.status(status).json({
    status,
    message: isProduction ? 'Internal Server Error' : err.message,
    code: 'INTERNAL_ERROR',
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method,
    // Only include stack trace in non-production environments
    ...(isProduction ? {} : { stack: err.stack })
  });
} 