/**
 * Atomic Demo Auto-Fill Routes
 * 
 * This file contains routes for the atomic demo auto-fill functionality.
 * It provides a server-side implementation that applies all demo values in a single operation
 * with progressive UI updates via WebSockets.
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { AtomicDemoAutoFillService } from '../services/atomic-demo-autofill';
import * as websocketService from '../services/websocket';
import getLogger from '../utils/logger';

const router = Router();
const logger = getLogger('AtomicDemoAutoFillRoutes');

// Create the service instance with WebSocket capabilities
const atomicDemoAutoFillService = new AtomicDemoAutoFillService(websocketService);

/**
 * POST /api/atomic-demo-autofill/:taskId
 * Apply demo values to a form atomically with progressive UI updates
 */
router.post('/api/atomic-demo-autofill/:taskId', requireAuth, async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId, 10);
    const formType = req.body.formType || 'kyb'; // Default to KYB if not specified
    
    if (isNaN(taskId)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid task ID' 
      });
    }
    
    logger.info('Atomic demo auto-fill requested', { 
      taskId, 
      formType, 
      userId: req.user?.id 
    });
    
    // Apply the demo data with progressive UI updates
    const result = await atomicDemoAutoFillService.applyDemoDataAtomically(
      taskId,
      formType,
      req.user?.id
    );
    
    return res.json({
      success: true,
      message: result.message,
      fieldCount: result.fieldCount
    });
  } catch (error) {
    logger.error('Error in atomic demo auto-fill endpoint', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    const statusCode = 
      error instanceof Error && error.message.includes('demo companies') ? 403 :
      error instanceof Error && error.message.includes('Task not found') ? 404 : 
      500;
    
    return res.status(statusCode).json({
      success: false,
      error: 'Error applying demo data',
      message: error instanceof Error ? error.message : 'An unknown error occurred'
    });
  }
});

/**
 * Add support to specific form types as aliases to the atomic endpoint
 */

// KYB atomic demo auto-fill endpoint
router.post('/api/kyb/atomic-demo-autofill/:taskId', requireAuth, async (req, res) => {
  req.body.formType = 'kyb';
  return router.handle(req, res);
});

// KY3P atomic demo auto-fill endpoint
router.post('/api/ky3p/atomic-demo-autofill/:taskId', requireAuth, async (req, res) => {
  req.body.formType = 'ky3p';
  return router.handle(req, res);
});

// Open Banking atomic demo auto-fill endpoint
router.post('/api/open-banking/atomic-demo-autofill/:taskId', requireAuth, async (req, res) => {
  req.body.formType = 'open_banking';
  return router.handle(req, res);
});

export default router;