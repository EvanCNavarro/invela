/**
 * KY3P Update Progress Route
 * 
 * This module adds the missing endpoint needed by the KY3PDemoAutoFill component
 * to update KY3P task progress and prevent it from being reset by reconciliation.
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { logger } from '../utils/logger';
import { updateKy3pProgressFixed } from '../utils/unified-progress-fixed';

const router = Router();

/**
 * POST /api/ky3p/update-progress/:taskId
 * 
 * Updates the progress for a KY3P task and adds a lock to prevent reconciliation
 * from overriding it immediately after.
 */
router.post('/api/ky3p/update-progress/:taskId', requireAuth, async (req, res) => {
  const taskId = parseInt(req.params.taskId, 10);
  const { progress, status } = req.body;
  
  if (isNaN(taskId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid task ID format'
    });
  }
  
  logger.info(`[KY3P Update Progress] Updating progress for task ${taskId}`, {
    taskId,
    progress,
    status,
    userId: req.user?.id
  });
  
  try {
    // 1. Set the reconciliation skip flag to prevent override
    // Initialize global skip object if not exists
    global.__skipTaskReconciliation = global.__skipTaskReconciliation || {};
    
    // Skip reconciliation for this task for the next 2 minutes (120,000 ms)
    // This prevents the task reconciliation system from overriding our progress value
    global.__skipTaskReconciliation[taskId] = Date.now() + 120000;
    
    logger.info(`[KY3P Update Progress] Added reconciliation lock for task ${taskId} until ${new Date(global.__skipTaskReconciliation[taskId]).toISOString()}`);
    
    // 2. Update the progress using our fixed function
    const result = await updateKy3pProgressFixed(taskId, {
      debug: true,
      forceUpdate: true,
      metadata: {
        source: 'demo_autofill',
        manualUpdate: true,
        statusOverride: status,
        lastManualUpdate: new Date().toISOString()
      }
    });
    
    // 3. Return the result to the client
    return res.json({
      success: result.success,
      message: result.message,
      progress: result.progress,
      taskId
    });
  } catch (error) {
    logger.error('[KY3P Update Progress] Error updating progress', {
      taskId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return res.status(500).json({
      success: false,
      message: 'Error updating KY3P progress',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
