/**
 * Bypass Auth Demo Auto-Fill Router
 * 
 * This router provides a completely authentication-free way to test demo auto-fill
 * functionality. It's designed for development and testing purposes only.
 */

import { Router } from 'express';
import { AtomicDemoAutoFillService } from '../services/atomic-demo-autofill';
import * as websocketService from '../services/websocket';
import { Logger } from '../utils/logger';

// Create a logger instance
const logger = new Logger('BypassAuthDemoAutofill');

// Create the router
const router = Router();

// This route is completely open - no authentication required
router.post('/test/:taskId/:formType', async (req, res) => {
  // Extract parameters directly from the request
  const { taskId } = req.params;
  const formType = req.params.formType || 'auto';
  const companyName = req.body.companyName || 'Test Company';
  
  logger.info(`[BYPASS-AUTH] Starting demo auto-fill for task ${taskId}, form ${formType}, company ${companyName}`);
  
  try {
    // Create the service
    const service = new AtomicDemoAutoFillService(websocketService);
    
    // Set dummy user ID for testing
    const mockUserId = 1;
    
    // Apply demo data using the service
    const result = await service.applyDemoDataAtomically({
      taskId: parseInt(taskId, 10),
      formType: formType as any,
      userId: mockUserId,
      companyName
    });
    
    logger.info(`[BYPASS-AUTH] Demo auto-fill completed successfully for task ${taskId}`, result);
    
    // Return success response
    res.json({
      success: true,
      message: `Successfully applied demo data for task ${taskId}`,
      details: result
    });
  } catch (error) {
    logger.error(`[BYPASS-AUTH] Error applying demo data:`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      taskId,
      formType,
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // Return error response
    res.status(500).json({
      success: false,
      message: 'Error applying demo data',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// This route is useful for health checks and testing WebSocket connectivity
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    websocketPath: '/ws',
    service: 'bypass-auth-demo-autofill'
  });
});

// Export the router
export default router;