/**
 * @file test-helpers.ts
 * @description Helper functions for API testing
 */

import express, { Express } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import bodyParser from 'body-parser';
import { env } from '../utils/env';
import { setupSwagger } from '../utils/swagger';
import authRoutes from '../routes/auth';
import userRoutes from '../routes/users';
import tasksRoutes from '../routes/tasks';
import filesRoutes from '../routes/files';
import { errorHandler } from '../middleware/error';

/**
 * Creates a test Express application with all routes configured
 * but database mocked for testing purposes
 */
export async function createTestApp(): Promise<Express> {
  const app = express();
  
  // Standard middleware
  app.use(cors());
  app.use(cookieParser(env.COOKIE_SECRET));
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));

  // Setup Swagger
  setupSwagger(app);
  
  // Setup routes
  app.use('/auth', authRoutes);
  app.use('/users', userRoutes);
  app.use('/tasks', tasksRoutes);
  app.use('/files', filesRoutes);
  
  // Error handling middleware
  app.use(errorHandler);
  
  return app;
}

/**
 * Helper to generate a valid authentication token for testing
 * authenticated endpoints
 */
export function getTestAuthToken(userId: string = '1'): string {
  // This would normally use your actual token generation logic
  // For tests, you can create a simplified version or use a mock
  return 'test-auth-token';
} 