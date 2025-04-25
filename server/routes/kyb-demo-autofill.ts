/**
 * Enhanced KYB Demo Auto-Fill Route
 * 
 * This route provides an improved API endpoint for KYB-specific demo auto-fill
 * with better error handling, detailed logging, and direct database access.
 */

import { Router } from 'express';
import { db } from '../../db';
import { requireAuth } from '../middleware/auth';
import { kybDemoAutoFill } from '../services/kyb-demo-autofill';
import { Logger } from '../utils/logger';

const router = Router();
const logger = new Logger('KYBEnhancedDemoAutoFillRoutes');

/**
 * Enhanced endpoint for KYB demo auto-fill
 * 
 * This endpoint uses an improved service that retrieves demo values directly from
 * the kyb_fields table and applies them to the appropriate responses.
 * 
 * Route: POST /api/kyb/enhanced-demo-autofill/:taskId
 */
router.post('/api/kyb/enhanced-demo-autofill/:taskId', requireAuth, async (req, res) => {
  const taskId = parseInt(req.params.taskId);
  const userId = req.user?.id;

  if (isNaN(taskId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid task ID'
    });
  }

  logger.info(`[KYB Enhanced Demo] Starting enhanced auto-fill for task ${taskId}`);

  try {
    // Verify task exists and belongs to this user's company
    const [task] = await db.execute(`
      SELECT t.* FROM tasks t
      WHERE t.id = $1 AND (
        t.company_id = $2 OR
        t.assigned_to = $3 OR 
        t.created_by = $3
      )
      LIMIT 1
    `, [taskId, req.user.company_id, userId]);

    if (!task) {
      logger.warn(`[KYB Enhanced Demo] Task ${taskId} not found or access denied for user ${userId}`);
      return res.status(404).json({
        success: false,
        message: 'Task not found or access denied'
      });
    }

    // Ensure this is a KYB task
    if (task.task_type !== 'kyb' && task.task_type !== 'company_kyb') {
      logger.warn(`[KYB Enhanced Demo] Task ${taskId} is not a KYB task (type: ${task.task_type})`);
      return res.status(400).json({
        success: false,
        message: 'Task is not a KYB task'
      });
    }

    // Call the service to perform the auto-fill
    const result = await kybDemoAutoFill(taskId, userId);
    
    logger.info(`[KYB Enhanced Demo] Auto-fill completed for task ${taskId}: ${result.success ? 'SUCCESS' : 'FAILED'}`);
    
    return res.json(result);
  } catch (error) {
    logger.error('[KYB Enhanced Demo] Error:', error);
    
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'An unexpected error occurred'
    });
  }
});

export default router;