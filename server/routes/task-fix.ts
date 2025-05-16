/**
 * Task Status Fix Route
 * 
 * This route provides a direct API endpoint to fix specific task status issues:
 * 1. KY3P task (#883) showing "Submitted" status but 0% progress - updates to 100% progress
 * 2. Open Banking task (#884) showing "Ready for Submission" when it should be "Submitted"
 */

import { Router } from 'express';
import { db } from '@db';
import { tasks } from '@db/schema';
import { eq } from 'drizzle-orm';
import { logger } from '../utils/logger';
import { broadcast } from '../utils/unified-websocket';
import { requireAuth } from '../middleware/auth';

const router = Router();

/**
 * Apply fixes to specific task status/progress issues
 */
router.post('/api/fix-task-status/:taskId', requireAuth, async (req, res) => {
  try {
    const { taskId } = req.params;
    const parsedTaskId = parseInt(taskId);
    
    if (isNaN(parsedTaskId)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid task ID' 
      });
    }
    
    logger.info('Starting task status/progress fix...', { taskId: parsedTaskId });
    const now = new Date();
    
    // Get current task information
    const [currentTask] = await db.select().from(tasks).where(eq(tasks.id, parsedTaskId));
    
    if (!currentTask) {
      return res.status(404).json({
        success: false,
        error: `Task with ID ${parsedTaskId} not found`
      });
    }
    
    logger.info('Found task to fix:', {
      taskId: parsedTaskId,
      taskType: currentTask.task_type,
      currentStatus: currentTask.status,
      currentProgress: currentTask.progress
    });
    
    // Apply specific fixes based on task type
    if (currentTask.task_type === 'ky3p' || currentTask.task_type === 'sp_ky3p_assessment') {
      // Fix KY3P task - ensure it has 100% progress with "submitted" status
      logger.info('Fixing KY3P task...', { taskId: parsedTaskId });
      
      await db.update(tasks)
        .set({
          status: 'submitted',
          progress: 100,
          completion_date: now,
          updated_at: now,
          metadata: {
            ...currentTask.metadata,
            submittedAt: now.toISOString(),
            submissionDate: now.toISOString(),
            submitted: true,
            completed: true
          }
        })
        .where(eq(tasks.id, parsedTaskId));
        
      // Broadcast the update
      broadcast('task_updated', {
        id: parsedTaskId,
        status: 'submitted',
        progress: 100,
        metadata: {
          submitted: true,
          submissionDate: now.toISOString()
        }
      });
      
      logger.info('Successfully fixed KY3P task status and progress', { 
        taskId: parsedTaskId, 
        newStatus: 'submitted', 
        newProgress: 100 
      });
      
      return res.json({
        success: true,
        message: `Fixed KY3P task #${parsedTaskId}: Status set to "submitted" and progress set to 100%`,
        task: {
          id: parsedTaskId,
          status: 'submitted',
          progress: 100
        }
      });
    } 
    else if (currentTask.task_type === 'open_banking') {
      // Fix Open Banking task - change status from "ready_for_submission" to "submitted"
      logger.info('Fixing Open Banking task...', { taskId: parsedTaskId });
      
      await db.update(tasks)
        .set({
          status: 'submitted',
          progress: 100,
          completion_date: now,
          updated_at: now,
          metadata: {
            ...currentTask.metadata,
            submittedAt: now.toISOString(),
            submissionDate: now.toISOString(),
            submitted: true,
            completed: true,
            explicitlySubmitted: true
          }
        })
        .where(eq(tasks.id, parsedTaskId));
        
      // Broadcast the update
      broadcast('task_updated', {
        id: parsedTaskId,
        status: 'submitted',
        progress: 100,
        metadata: {
          submitted: true,
          submissionDate: now.toISOString()
        }
      });
      
      logger.info('Successfully fixed Open Banking task status', { 
        taskId: parsedTaskId, 
        newStatus: 'submitted', 
        newProgress: 100 
      });
      
      return res.json({
        success: true,
        message: `Fixed Open Banking task #${parsedTaskId}: Status changed to "submitted"`,
        task: {
          id: parsedTaskId,
          status: 'submitted',
          progress: 100
        }
      });
    } 
    else {
      // Generic fix for any other task type
      logger.info('Applying generic fix to task...', { 
        taskId: parsedTaskId, 
        taskType: currentTask.task_type 
      });
      
      await db.update(tasks)
        .set({
          status: 'submitted',
          progress: 100,
          completion_date: now,
          updated_at: now
        })
        .where(eq(tasks.id, parsedTaskId));
        
      // Broadcast the update
      broadcast('task_updated', {
        id: parsedTaskId,
        status: 'submitted',
        progress: 100
      });
      
      logger.info('Applied generic fix to task', { 
        taskId: parsedTaskId, 
        newStatus: 'submitted', 
        newProgress: 100 
      });
      
      return res.json({
        success: true,
        message: `Applied generic fix to task #${parsedTaskId}: Status set to "submitted" and progress set to 100%`,
        task: {
          id: parsedTaskId,
          status: 'submitted',
          progress: 100
        }
      });
    }
  } catch (error) {
    logger.error('Error fixing task issues:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return res.status(500).json({
      success: false,
      error: 'Error fixing task issues: ' + (error instanceof Error ? error.message : 'Unknown error')
    });
  }
});

export default router;