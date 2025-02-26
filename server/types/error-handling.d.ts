/**
 * Type declarations for error handling utilities
 */

// Extend Error interface to include stack and message properties
interface ExtendedError extends Error {
  stack?: string;
  message: string;
  code?: string | number;
  status?: number;
  statusCode?: number;
}

// Error handler middleware function type
type ErrorHandlerMiddleware = (err: ExtendedError, req: any, res: any, next: any) => void;

// Application Error class
declare class AppError extends Error {
  status: number;
  code: string;
  constructor(message: string, status: number, code: string);
}

declare global {
  interface Error {
    code?: string | number;
    status?: number;
    statusCode?: number;
    stack?: string;
  }
} 