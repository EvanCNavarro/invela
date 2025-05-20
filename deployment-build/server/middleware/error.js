"use strict";
/**
 * @file error.ts
 * @description Global error handling middleware for Express.
 * Provides consistent error responses across all API endpoints.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
const errors_1 = require("@shared/utils/errors");
const zod_validation_error_1 = require("zod-validation-error");
const zod_1 = require("zod");
/**
 * Global error handling middleware.
 * Catches all errors thrown in route handlers and formats them into consistent responses.
 *
 * @param err - The error object thrown in the request pipeline
 * @param req - The Express request object
 * @param res - The Express response object
 * @param next - The Express next function
 */
function errorHandler(err, req, res, next) {
    // Log all errors for debugging and monitoring
    console.error(`[Error] ${req.method} ${req.path}:`, err);
    // Handle Zod validation errors
    if (err instanceof zod_1.ZodError) {
        const validationError = (0, zod_validation_error_1.fromZodError)(err);
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
    if (err instanceof errors_1.AppError) {
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
