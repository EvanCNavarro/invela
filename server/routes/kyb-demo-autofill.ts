/**
 * Enhanced KYB Demo Auto-Fill Route
 * 
 * This route provides an improved API endpoint for KYB-specific demo auto-fill
 */

import { Router } from 'express';
import * as db from '@db';
import { eq } from 'drizzle-orm';
import { tasks } from '@db/schema';
import { requireAuth } from '../middleware/auth';
import { kybDemoAutoFill } from '../services/kyb-demo-autofill';
import getLogger from '@/utils/logger';

const logger = getLogger('KybDemoAutoFillRoute');

// Create router
const router = Router();

/**
 * Enhanced endpoint for KYB demo auto-fill
 */
router.post('/api/kyb/enhanced-demo-autofill/:taskId', requireAuth, async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId, 10);
    
    if (isNaN(taskId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid task ID' 
      });
    }
    
    logger.info(`[DEBUG] Enhanced KYB Demo Auto-fill requested for task ${taskId}`);
    
    // Get the task to verify it exists and belongs to the user
    const [task] = await db.select()
      .from(tasks)
      .where(eq(tasks.id, taskId));
    
    if (!task) {
      return res.status(404).json({ 
        success: false, 
        message: 'Task not found' 
      });
    }

    // Ensure this is a KYB task
    if (task.task_type !== 'company_kyb' && task.task_type !== 'kyb') {
      return res.status(400).json({
        success: false,
        message: `Task ${taskId} is not a KYB task (type: ${task.task_type})`
      });
    }
    
    // Use current user ID from session
    const userId = req.user?.id;
    
    // Call the KYB demo auto-fill service with detailed logging
    logger.info(`Running enhanced KYB demo auto-fill for task ${taskId}, user ${userId}`);
    
    const result = await kybDemoAutoFill(taskId, userId);
    
    if (!result.success) {
      logger.error(`KYB demo auto-fill failed: ${result.message}`);
      return res.status(500).json(result);
    }
    
    logger.info(`KYB demo auto-fill successful for task ${taskId}, filled ${result.fieldCount} fields`);
    
    // Return success response with form data for client-side optimization
    return res.json(result);
    
  } catch (error) {
    logger.error('Error in enhanced KYB demo auto-fill endpoint:', error);
    return res.status(500).json({ 
      success: false, 
      message: error instanceof Error ? error.message : 'An unexpected error occurred'
    });
  }
});

export default router;