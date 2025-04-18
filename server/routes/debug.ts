/**
 * Debug Routes
 * 
 * This module contains routes for debugging and fixing issues with tasks,
 * particularly related to status and submission state management.
 */

import { Request, Response, Router } from 'express';
import { db } from '@db';
import { tasks } from '@db/schema';
import { eq } from 'drizzle-orm';
import { fixTaskSubmittedStatus } from '../middleware/task-status';

const router = Router();

/**
 * Get detailed task information for debugging
 */
router.get('/task/:taskId', async (req: Request, res: Response) => {
  try {
    const taskId = parseInt(req.params.taskId);
    if (isNaN(taskId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid task ID'
      });
    }
    
    // Get basic task info
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId)
    });
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }
    
    // Check if task has submission date
    const hasSubmissionDate = task.metadata && 
      'submissionDate' in task.metadata && 
      task.metadata.submissionDate !== null;
    
    // Check for submitted flag
    const hasSubmittedFlag = task.metadata && 
      'submitted' in task.metadata && 
      task.metadata.submitted === true;
    
    // Check if task is in a terminal state
    const isTerminalState = ['submitted', 'completed', 'approved', 'rejected'].includes(task.status);
    
    return res.status(200).json({
      success: true,
      task,
      metadata: task.metadata,
      statusInfo: {
        current: task.status,
        isTerminal: isTerminalState
      },
      hasSubmissionDate,
      hasSubmittedFlag,
      isTerminalState
    });
  } catch (error) {
    console.error('Error getting task debug info:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error fetching task debug info'
    });
  }
});

/**
 * Fix a task that should be in submitted status
 */
router.post('/force-submit/:taskId', async (req: Request, res: Response) => {
  try {
    const taskId = parseInt(req.params.taskId);
    if (isNaN(taskId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid task ID'
      });
    }
    
    // Use the middleware utility function to fix the task status
    const result = await fixTaskSubmittedStatus(taskId);
    
    if (result) {
      return res.status(200).json({
        success: true,
        message: 'Task status fixed successfully'
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Task status not fixed - task may not have a submission date'
      });
    }
  } catch (error) {
    console.error('Error fixing task submitted status:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error fixing task status'
    });
  }
});

export default router;