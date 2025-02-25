/**
 * @file errors.ts
 * @description Centralized error handling classes for the application.
 * These error classes are shared between client and server to ensure consistent error handling.
 */

/**
 * Base application error class that all specific error types extend from.
 * Provides a consistent structure for error handling across the application.
 */
export class AppError extends Error {
  constructor(
    public message: string,
    public status: number = 500,
    public code: string = 'UNKNOWN_ERROR',
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * Authentication-specific error class.
 * Used for authentication failures like invalid credentials, expired tokens, etc.
 */
export class AuthError extends AppError {
  constructor(
    message: string = 'Authentication failed',
    code: string = 'AUTH_ERROR'
  ) {
    super(message, 401, code);
    this.name = 'AuthError';
  }
}

/**
 * Validation-specific error class.
 * Used for input validation failures, typically from Zod schema validation.
 */
export class ValidationError extends AppError {
  constructor(
    message: string = 'Validation failed',
    details?: any
  ) {
    super(message, 400, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

/**
 * Not found error class.
 * Used when a requested resource cannot be found in the database.
 */
export class NotFoundError extends AppError {
  constructor(
    entity: string = 'Resource',
    id?: string | number
  ) {
    const message = id 
      ? `${entity} with ID ${id} not found` 
      : `${entity} not found`;
    
    super(message, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
} 