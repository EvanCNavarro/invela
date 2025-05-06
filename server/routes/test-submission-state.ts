/**
 * Test Submission State Helper
 * 
 * This file provides endpoints to test the submission state preservation fixes
 */

import { Router } from 'express';
import { db } from '@db';
import { tasks } from '@db/schema';
import { eq } from 'drizzle-orm';
import { broadcastTaskUpdate } from '../services/websocket';

export const createTestSubmissionStateRouter = () => {
  const router = Router();
  
  /**
   * POST /api/test-submission/submit
   * Test endpoint to mark a task as submitted
   */
  router.post('/submit', async (req, res) => {
    try {
      const { taskId } = req.body;
      
      if (!taskId) {
        return res.status(400).json({ success: false, message: 'Task ID is required' });
      }
      
      // Fetch current task
      const task = await db.query.tasks.findFirst({
        where: eq(tasks.id, taskId)
      });
      
      if (!task) {
        return res.status(404).json({ success: false, message: 'Task not found' });
      }
      
      // Mark task as submitted with proper metadata
      const now = new Date();
      const submissionDate = now.toISOString();
      
      // Update the task
      await db.update(tasks)
        .set({
          status: 'submitted',
          progress: 100,
          metadata: {
            ...task.metadata,
            submitted: true,
            submissionDate: submissionDate,
            submittedAt: submissionDate,
            fileId: `test-file-${Date.now()}`, // Mock file ID
            lastUpdated: submissionDate
          },
          updated_at: now
        })
        .where(eq(tasks.id, taskId));
      
      // Broadcast the update
      await broadcastTaskUpdate({
        id: taskId,
        status: 'submitted',
        progress: 100,
        metadata: {
          submitted: true,
          submissionDate: submissionDate,
          submittedAt: submissionDate,
          fileId: `test-file-${Date.now()}`
        }
      });
      
      return res.status(200).json({
        success: true,
        message: 'Task marked as submitted',
        taskId,
        submissionDate
      });
    } catch (error) {
      console.error('Error in test submission endpoint:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  /**
   * POST /api/test-submission/check-preservation
   * Test if a task maintains its submitted state after unlocking
   */
  router.post('/check-preservation', async (req, res) => {
    try {
      const { taskId } = req.body;
      
      if (!taskId) {
        return res.status(400).json({ success: false, message: 'Task ID is required' });
      }
      
      // Fetch current task state
      const taskBefore = await db.query.tasks.findFirst({
        where: eq(tasks.id, taskId)
      });
      
      if (!taskBefore) {
        return res.status(404).json({ success: false, message: 'Task not found' });
      }
      
      // Run the task unlocking process which previously had the issue
      const { unlockAllTasks } = await import('../routes/task-dependencies');
      
      if (!taskBefore.company_id) {
        return res.status(400).json({ success: false, message: 'Task has no company ID' });
      }
      
      // Log before state
      console.log(`[TestSubmission] Task ${taskId} before unlocking:`, {
        status: taskBefore.status,
        progress: taskBefore.progress,
        metadata: {
          submitted: taskBefore.metadata?.submitted,
          submissionDate: taskBefore.metadata?.submissionDate,
          fileId: taskBefore.metadata?.fileId
        }
      });
      
      // Run unlocking process
      await unlockAllTasks(taskBefore.company_id);
      
      // Fetch task after unlocking
      const taskAfter = await db.query.tasks.findFirst({
        where: eq(tasks.id, taskId)
      });
      
      if (!taskAfter) {
        return res.status(500).json({ success: false, message: 'Could not find task after unlocking' });
      }
      
      // Log after state
      console.log(`[TestSubmission] Task ${taskId} after unlocking:`, {
        status: taskAfter.status,
        progress: taskAfter.progress,
        metadata: {
          submitted: taskAfter.metadata?.submitted,
          submissionDate: taskAfter.metadata?.submissionDate,
          fileId: taskAfter.metadata?.fileId
        }
      });
      
      // Check if submitted state was preserved
      const preserved = taskAfter.status === 'submitted' && 
                         taskAfter.progress === 100 &&
                         taskAfter.metadata?.submitted === true;
      
      return res.status(200).json({
        success: true,
        taskId,
        preserved,
        before: {
          status: taskBefore.status,
          progress: taskBefore.progress,
          hasSubmissionFlag: !!taskBefore.metadata?.submitted,
          hasSubmissionDate: !!(taskBefore.metadata?.submissionDate || taskBefore.metadata?.submittedAt)
        },
        after: {
          status: taskAfter.status,
          progress: taskAfter.progress,
          hasSubmissionFlag: !!taskAfter.metadata?.submitted,
          hasSubmissionDate: !!(taskAfter.metadata?.submissionDate || taskAfter.metadata?.submittedAt)
        }
      });
    } catch (error) {
      console.error('Error in test preservation endpoint:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  return router;
};

export default createTestSubmissionStateRouter;