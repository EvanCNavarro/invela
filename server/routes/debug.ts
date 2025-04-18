/**
 * Debug routes to help inspect the current state of the system
 * These are development-only endpoints used for troubleshooting
 */
import { Router } from 'express';
import { db } from '@db';
import { eq } from 'drizzle-orm';
import { tasks } from '@db/schema';
import { broadcastProgressUpdate } from '../utils/progress';
import { TaskStatus } from '../types';

const router = Router();

// Get detailed task info for debugging
router.get('/task/:taskId', async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    
    if (isNaN(taskId)) {
      return res.status(400).json({ error: 'Invalid task ID' });
    }
    
    // Get the task
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId)
    });
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    return res.json({
      task,
      metadata: task.metadata || {},
      hasSubmissionDate: !!task.metadata?.submissionDate,
      hasSubmittedFlag: task.metadata?.status === 'submitted',
      isTerminalState: [TaskStatus.SUBMITTED, TaskStatus.COMPLETED, TaskStatus.APPROVED].includes(task.status as TaskStatus),
      statusInfo: {
        current: task.status,
        progress: task.progress
      }
    });
  } catch (error) {
    console.error('Debug route error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Force a task to SUBMITTED status for testing
router.post('/force-submit/:taskId', async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    
    if (isNaN(taskId)) {
      return res.status(400).json({ error: 'Invalid task ID' });
    }
    
    // Get the task
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId)
    });
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    // Force set to submitted status
    const submissionTime = new Date().toISOString();
    
    // Update task in database
    await db.update(tasks)
      .set({
        status: TaskStatus.SUBMITTED,
        progress: 100,
        updated_at: new Date(),
        metadata: {
          ...task.metadata,
          submissionDate: submissionTime,
          status: 'submitted' // Explicit marker for submission
        }
      })
      .where(eq(tasks.id, taskId));
    
    // Broadcast the update
    broadcastProgressUpdate(
      taskId,
      100,
      TaskStatus.SUBMITTED,
      {
        ...task.metadata,
        submissionDate: submissionTime,
        status: 'submitted'
      }
    );
    
    return res.json({
      message: 'Task forcibly set to SUBMITTED status',
      taskId,
      submissionTime
    });
  } catch (error) {
    console.error('Debug route error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;