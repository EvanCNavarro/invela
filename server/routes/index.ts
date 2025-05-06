/**
 * Routes Index
 * 
 * This file exports route functions to be used in the main server setup.
 */

import { Router } from 'express';
import { createUnifiedFormSubmissionRouter } from './unified-form-submission';
import taskProgressRouter from './task-progress';

/**
 * Create unified form submission router
 */
export { createUnifiedFormSubmissionRouter };

/**
 * Register API routes
 */
export function registerApiRoutes(app: any) {
  console.log('[Routes] Setting up task progress API routes');
  app.use('/api/tasks', taskProgressRouter);
  console.log('[Routes] Successfully registered task progress API routes');
}

// Test routes have been removed
// They have been replaced with standardized implementations