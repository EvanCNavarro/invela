/**
 * Test endpoint for Demo Auto-Fill functionality
 * 
 * This module adds a test endpoint to verify the demo auto-fill functionality
 * without requiring authentication.
 */

import { Router } from 'express';
import { AtomicDemoAutoFillService } from '../services/atomic-demo-autofill';
import * as websocketService from '../services/websocket';
import { logger } from '../utils/logger';

// Create the router
const router = Router();

/**
 * Test endpoint for demo auto-fill functionality
 * This endpoint allows testing the auto-fill functionality without authentication
 * It should only be used during development and removed in production
 */
router.post('/test/:taskId/:formType?', async (req, res) => {
  const { taskId } = req.params;
  const formType = req.params.formType || 'auto'; // Default to auto-detection
  
  // Create the service
  const service = new AtomicDemoAutoFillService(websocketService);
  
  try {
    logger.info(`[TEST-DEMO-AUTOFILL] Applying demo data for task ${taskId} with form type ${formType}`);
    
    // Set dummy user ID for testing
    const mockUserId = 1;
    const companyName = req.query.companyName as string || 'Test Company';
    
    // Apply demo data using the service
    const result = await service.applyDemoDataAtomically(
      parseInt(taskId, 10),
      formType as any,
      mockUserId,
      companyName
    );
    
    logger.info(`[TEST-DEMO-AUTOFILL] Successfully applied demo data`, result);
    
    res.json({
      success: true,
      message: `Successfully applied demo data for task ${taskId}`,
      details: result
    });
  } catch (error) {
    logger.error('[TEST-DEMO-AUTOFILL] Error applying demo data:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      taskId,
      formType
    });
    
    res.status(500).json({
      success: false,
      message: 'Error applying demo data',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Export the router
export default router;