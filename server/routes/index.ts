/**
 * Routes Index
 * 
 * This file exports route functions to be used in the main server setup.
 */

import { Router } from 'express';
import { createUnifiedFormSubmissionRouter } from './unified-form-submission';
import taskProgressRouter from './task-progress';
import kybClearRouter from './kyb-clear';

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
  
  // Register KYB clear fields route
  console.log('[Routes] Setting up KYB clear fields API route');
  app.use(kybClearRouter);
  console.log('[Routes] Successfully registered KYB clear fields API route');
}

// Test routes have been removed
// They have been replaced with standardized implementations