/**
 * @file index.ts
 * @description Main export file for shared types and utilities
 */

// Export all types
export * from './types/auth';
export * from './types/tasks';
export * from './types/websocket';

// Export all utilities
export * from './utils/errors';

// Any additional shared constants
export const API_VERSION = 'v1'; 