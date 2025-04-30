/**
 * Routes Index
 * 
 * This file exports route functions to be used in the main server setup.
 */

import { Router } from 'express';
import { createUnifiedFormSubmissionRouter } from './unified-form-submission';
import { createTestWebSocketRoutes } from './test-websocket';

/**
 * Create unified form submission router
 */
export { createUnifiedFormSubmissionRouter };

/**
 * Create test WebSocket router
 */
export { createTestWebSocketRoutes };