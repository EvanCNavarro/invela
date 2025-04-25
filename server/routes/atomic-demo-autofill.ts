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
import { Logger } from '../utils/logger';

const logger = new Logger('AtomicDemoAutoFill');
const router = Router();

// Create an instance of the service with the WebSocket service
const atomicDemoAutoFillService = new AtomicDemoAutoFillService(websocketService);

/**
 * POST /api/atomic-demo-autofill/:taskId
 * Apply demo values to a form atomically with progressive UI updates
 */
router.post('/api/atomic-demo-autofill/:taskId', requireAuth, async (req, res) => {
  try {
    const { taskId } = req.params;
    const taskIdNum = parseInt(taskId, 10);
    
    if (isNaN(taskIdNum)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid task ID'
      });
    }
    
    // Get form type from the request body, defaulting to 'kyb'
    const formType = req.body.formType || 'kyb';
    
    logger.info(`Received atomic demo auto-fill request for task ${taskIdNum} (${formType})`);
    
    // Get the user ID from the authenticated user
    const userId = req.user?.id;
    
    // Apply the demo data with WebSocket updates
    const result = await atomicDemoAutoFillService.applyDemoDataAtomically(
      taskIdNum,
      formType,
      userId
    );
    
    logger.info(`Atomic demo auto-fill completed for task ${taskIdNum}:`, {
      success: result.success,
      fieldCount: result.fieldCount
    });
    
    return res.json({
      success: true,
      message: result.message,
      fieldCount: result.fieldCount,
      taskId: taskIdNum
    });
  } catch (error) {
    logger.error('Error in atomic demo auto-fill route:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return res.status(500).json({
      success: false,
      message: 'An error occurred while applying demo data',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/atomic-demo-autofill/status
 * Return the status of the atomic demo auto-fill service
 */
router.get('/api/atomic-demo-autofill/status', requireAuth, async (req, res) => {
  try {
    // Simply return service status
    return res.json({
      success: true,
      message: 'Atomic demo auto-fill service is available',
      serviceVersion: '1.0.0',
      supportsFormTypes: ['kyb', 'company_kyb', 'ky3p', 'open_banking']
    });
  } catch (error) {
    logger.error('Error in service status route:', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return res.status(500).json({
      success: false,
      message: 'An error occurred while checking service status'
    });
  }
});

export default router;