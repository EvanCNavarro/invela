/**
 * Unified Demo Service Routes
 * 
 * This module provides route handlers for the unified demo service functionality.
 * It allows applying demo data to different form types in a consistent way.
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { UnifiedDemoService } from '../services/unifiedDemoService';
import { logger } from '../utils/logger';

const router = Router();
const demoService = new UnifiedDemoService();

/**
 * Apply demo data to any form task type
 * POST /api/unified-demo/apply/:taskId
 */
router.post('/api/unified-demo/apply/:taskId', requireAuth, async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    if (isNaN(taskId) || taskId <= 0) {
      return res.status(400).json({ error: 'Invalid task ID' });
    }

    logger.info(`[UnifiedDemoServiceRoutes] Applying demo data to task ${taskId}`);
    
    const result = await demoService.applyDemoDataToTask(taskId);
    
    return res.json({
      success: true,
      taskId,
      message: `Successfully applied demo data to ${result.taskType} task`,
      recordsUpdated: result.recordsUpdated,
      progress: result.progress,
      taskType: result.taskType
    });
  } catch (error) {
    logger.error(`[UnifiedDemoServiceRoutes] Error applying demo data: ${error instanceof Error ? error.message : String(error)}`);
    
    // Provide more detailed error information to help debug
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStatus = errorMessage.includes('not found') ? 404 : 500;
    const errorResponse = {
      error: errorMessage,
      details: error instanceof Error && error.stack ? error.stack.split('\n') : undefined,
      data: req.body as Record<string, any> || undefined
    };
    
    return res.status(errorStatus).json(errorResponse);
  }
});

/**
 * Get demo data for a specific task type without applying it
 * GET /api/unified-demo/data/:taskType
 */
router.get('/api/unified-demo/data/:taskType', requireAuth, async (req, res) => {
  try {
    const { taskType } = req.params;
    
    if (!['kyb', 'ky3p', 'open_banking', 'company_kyb'].includes(taskType)) {
      return res.status(400).json({ error: 'Invalid task type. Must be one of: kyb, ky3p, open_banking, company_kyb' });
    }
    
    const normalizedTaskType = taskType === 'company_kyb' ? 'kyb' : taskType;
    
    logger.info(`[UnifiedDemoServiceRoutes] Getting demo data for task type ${normalizedTaskType}`);
    
    const demoData = await demoService.getDemoDataForTaskType(normalizedTaskType);
    
    return res.json({
      success: true,
      taskType: normalizedTaskType, 
      demoData
    });
  } catch (error) {
    logger.error(`[UnifiedDemoServiceRoutes] Error getting demo data: ${error instanceof Error ? error.message : String(error)}`);
    
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error && error.stack ? error.stack.split('\n') : undefined
    });
  }
});

/**
 * Clear all responses for a specific task
 * POST /api/unified-demo/clear/:taskId
 */
router.post('/api/unified-demo/clear/:taskId', requireAuth, async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    if (isNaN(taskId) || taskId <= 0) {
      return res.status(400).json({ error: 'Invalid task ID' });
    }

    // Whether to reset progress to 0 after clearing responses
    // Default is true, set to false to preserve progress (e.g. when editing a submitted form)
    const resetProgress = req.query.resetProgress !== 'false';
    
    logger.info(`[UnifiedDemoServiceRoutes] Clearing responses for task ${taskId}, resetProgress=${resetProgress}`);
    
    const result = await demoService.clearTaskResponses(taskId, resetProgress);
    
    return res.json({
      success: true,
      taskId,
      message: `Successfully cleared ${result.taskType} task responses`,
      recordsDeleted: result.recordsDeleted,
      progress: result.progress,
      taskType: result.taskType,
      resetProgress
    });
  } catch (error) {
    logger.error(`[UnifiedDemoServiceRoutes] Error clearing responses: ${error instanceof Error ? error.message : String(error)}`);
    
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error && error.stack ? error.stack.split('\n') : undefined
    });
  }
});

export default router;
