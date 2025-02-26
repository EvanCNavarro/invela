/**
 * @file errors.ts
 * @description Centralized error handling classes for the application.
 * These error classes are shared between client and server to ensure consistent error handling.
 */

/**
 * Base application error class
 */
export class AppError extends Error {
  code: string;
  statusCode: number;

  constructor(message: string, code: string, statusCode: number = 500) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

/**
 * Authentication related errors
 */
export class AuthError extends AppError {
  constructor(message: string, code: string, statusCode: number = 401) {
    super(message, code, statusCode);
    this.name = 'AuthError';
  }
}

/**
 * Database related errors
 */
export class DbError extends AppError {
  constructor(message: string, code: string, statusCode: number = 500) {
    super(message, code, statusCode);
    this.name = 'DbError';
  }
}

/**
 * Validation errors
 */
export class ValidationError extends AppError {
  constructor(message: string, code: string, statusCode: number = 400) {
    super(message, code, statusCode);
    this.name = 'ValidationError';
  }
}

/**
 * Not found errors
 */
export class NotFoundError extends AppError {
  constructor(message: string, code: string, statusCode: number = 404) {
    super(message, code, statusCode);
    this.name = 'NotFoundError';
  }
}

/**
 * Unauthorized access errors
 */
export class UnauthorizedError extends AppError {
  constructor(message: string, code: string, statusCode: number = 403) {
    super(message, code, statusCode);
    this.name = 'UnauthorizedError';
  }
}

/**
 * Rate limit errors
 */
export class RateLimitError extends AppError {
  constructor(message: string, code: string, statusCode: number = 429) {
    super(message, code, statusCode);
    this.name = 'RateLimitError';
  }
}

/**
 * Connection errors for network/service failures
 */
export class ConnectionError extends AppError {
  constructor(message: string, code: string, statusCode: number = 503) {
    super(message, code, statusCode);
    this.name = 'ConnectionError';
  }
}

/**
 * Create an application error from any caught error
 */
export function createErrorFromCaught(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }
  
  if (error instanceof Error) {
    return new AppError(error.message, 'UNKNOWN_ERROR');
  }
  
  return new AppError(String(error), 'UNKNOWN_ERROR');
} 