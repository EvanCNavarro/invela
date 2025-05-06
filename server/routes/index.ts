/**
 * Main Routes File
 * 
 * This file registers all application routes, ensuring that form submission
 * and related endpoints are properly integrated.
 */

import { Express } from 'express';
import taskDependenciesRouter from './task-dependencies';
import unifiedFormSubmissionRouter from './unified-form-submission';
import { logger } from '../utils/logger';

const log = logger.child({ module: 'Routes' });

/**
 * Register all application routes
 * 
 * @param app Express application instance
 */
export function registerRoutes(app: Express): void {
  logger.info('Registering application routes');
  
  // Register task dependencies router
  app.use(taskDependenciesRouter);
  logger.info('Registered task dependencies router');
  
  // Register unified form submission router
  app.use(unifiedFormSubmissionRouter);
  logger.info('Successfully registered unified form submission router');
  
  // Add more routers here as needed
  
  logger.info('Routes setup completed');
}
