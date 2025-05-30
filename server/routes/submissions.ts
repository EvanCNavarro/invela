import { Router } from 'express';
import { db } from '@db';
import { tasks, TaskStatus } from '@db/schema';
import { eq } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth';
import { broadcastTaskUpdate } from "../utils/unified-websocket";
import { logger } from '../utils/logger';

const router = Router();
// Logger is already initialized in the imported module

// Create a dedicated endpoint for checking form submission status
// This is more reliable than WebSockets for critical confirmation flow
router.get('/check/:taskId', requireAuth, async (req, res) => {
  const taskId = parseInt(req.params.taskId);
  
  if (isNaN(taskId)) {
    logger.error('Invalid task ID provided:', req.params.taskId);
    return res.status(400).json({ 
      success: false, 
      message: 'Invalid task ID'
    });
  }
  
  try {
    logger.info(`Checking submission status for task ${taskId}`);
    
    // Get task data from database
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId)
    });
    
    if (!task) {
      logger.warn(`Task ${taskId} not found`);
      return res.status(404).json({ 
        success: false, 
        message: 'Task not found'
      });
    }
    
    // If task status is 'submitted' or 'completed', it was successfully submitted
    const isSubmitted = task.status === TaskStatus.SUBMITTED || task.status === TaskStatus.COMPLETED;
    
    // Check if we have a submission date in metadata
    const submissionDate = task.metadata?.submissionDate || null;
    
    logger.info(`Task ${taskId} submission status:`, {
      isSubmitted, 
      taskStatus: task.status,
      progress: task.progress
    });
    
    // Send back confirmation status
    res.json({
      success: true,
      status: {
        isSubmitted,
        taskStatus: task.status,
        submissionDate,
        lastUpdated: task.updated_at || new Date().toISOString(),
        progress: task.progress
      }
    });
    
    // If we're confirming a submission, also broadcast via WebSocket as a backup
    if (isSubmitted) {
      try {
        logger.info(`Broadcasting submission status via WebSocket for task ${taskId}`);
        WebSocketService.broadcast('submission_status', {
          taskId,
          status: 'submitted'
        });
      } catch (error) {
        logger.error('Error broadcasting status via WebSocket:', error);
      }
    }
    
  } catch (error) {
    logger.error('Error checking submission status:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error checking submission status'
    });
  }
});

export default router;