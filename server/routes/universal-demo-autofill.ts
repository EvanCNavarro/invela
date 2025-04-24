/**
 * Universal Demo Auto-Fill API Route
 * 
 * This file provides a unified API endpoint for automatically filling all form types
 * (KYB, KY3P, Open Banking) with demo data using the UniversalDemoAutoFillService.
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { Logger } from '../utils/logger';
import { universalDemoAutoFillService } from '../services/universalDemoAutoFillService';

const router = Router();
const logger = new Logger('UniversalDemoAutoFillRoute');

/**
 * Unified endpoint for demo auto-fill across all form types
 * This endpoint automatically detects the form type from the task
 * and uses the appropriate service to fill the form with demo data.
 */
router.post('/api/forms/demo-autofill/:taskId', requireAuth, async (req, res) => {
  const taskId = parseInt(req.params.taskId);
  
  if (isNaN(taskId)) {
    logger.warn('Invalid task ID provided', { 
      taskId: req.params.taskId,
      userId: req.user?.id
    });
    
    return res.status(400).json({
      success: false,
      message: 'Invalid task ID'
    });
  }
  
  logger.info('Processing demo auto-fill request', { 
    taskId,
    userId: req.user?.id
  });
  
  try {
    // Use the universal service to auto-fill the task
    const result = await universalDemoAutoFillService.autoFillTask(
      taskId,
      req.user?.id
    );
    
    if (result.success) {
      logger.info('Demo auto-fill successful', { 
        taskId, 
        formType: result.formType,
        fieldCount: result.fieldCount
      });
      
      return res.json({
        success: true,
        formType: result.formType,
        fieldCount: result.fieldCount,
        message: result.message
      });
    } else {
      logger.warn('Demo auto-fill failed', { 
        taskId, 
        reason: result.message
      });
      
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    logger.error('Error during demo auto-fill', {
      taskId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'An unexpected error occurred'
    });
  }
});

export default router;