"use strict";
/**
 * @file performance.ts
 * @description Performance monitoring middleware for Express
 * Tracks request durations and other performance metrics
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.performanceMonitor = performanceMonitor;
const vite_1 = require("../vite");
/**
 * Middleware that measures request duration and logs performance information.
 * Can be extended to report to external monitoring systems.
 */
function performanceMonitor(req, res, next) {
    // Skip for certain paths that don't need monitoring
    if (req.path === '/health' || req.path === '/api/health') {
        return next();
    }
    // Record start time
    const startTime = process.hrtime();
    // Add response listener to calculate duration when request completes
    res.on('finish', () => {
        const endTime = process.hrtime(startTime);
        const duration = endTime[0] * 1000 + endTime[1] / 1000000; // Convert to ms
        // Log performance information
        (0, vite_1.log)(`[Performance] ${req.method} ${req.originalUrl} - ${duration.toFixed(2)}ms - Status: ${res.statusCode}`);
        // If request took too long, log a warning
        if (duration > 1000) {
            (0, vite_1.log)(`[Performance] ⚠️ Slow request: ${req.method} ${req.originalUrl} - ${duration.toFixed(2)}ms`);
        }
        // Store performance metrics in a format that could be sent to a monitoring service
        const metrics = {
            method: req.method,
            path: req.originalUrl,
            statusCode: res.statusCode,
            duration: duration,
            timestamp: new Date().toISOString()
        };
        // This could be extended to:
        // 1. Send metrics to a time-series database (like Prometheus)
        // 2. Monitor memory usage
        // 3. Track database query times
        // 4. Integrate with services like Datadog, New Relic, etc.
    });
    next();
}
