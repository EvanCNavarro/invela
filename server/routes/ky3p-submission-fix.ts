/**
 * KY3P Submission Fix
 * 
 * This module adds a route to correctly handle KY3P form submissions,
 * ensuring they get marked as "submitted" with 100% progress similar to KYB forms.
 */

import express from 'express';
import { db } from '@db';
import { tasks } from '@db/schema';
import { eq } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth';
import { logger } from '../utils/logger';
import * as WebSocketService from '../services/websocket';

const router = express.Router();

/**
 * POST /api/ky3p/submit-form/:taskId
 * 
 * Handles KY3P form submissions and properly sets the task status to "submitted"
 */
router.post('/api/ky3p/submit-form/:taskId', requireAuth, async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    if (isNaN(taskId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid task ID'
      });
    }
    
    logger.info(`KY3P form submission requested for task ${taskId}`, {
      taskId,
      userId: req.user?.id,
      timestamp: new Date().toISOString()
    });
    
    // Get the task to confirm it's a KY3P task
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId)
    });
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: `Task ${taskId} not found`
      });
    }
    
    // Verify it's a KY3P task
    if (!task.task_type.includes('ky3p')) {
      return res.status(400).json({
        success: false,
        message: `Task ${taskId} is not a KY3P task (type: ${task.task_type})`
      });
    }
    
    // Update the task status to submitted
    const now = new Date();
    const submissionDate = now.toISOString();
    
    // Broadcast submission in progress
    try {
      WebSocketService.broadcast('form_submission', {
        taskId,
        formType: 'ky3p',
        status: 'in_progress',
        companyId: task.company_id,
        payload: {
          progress: 50,
          message: 'Processing KY3P form submission...',
          timestamp: submissionDate
        }
      });
    } catch (wsError) {
      logger.warn('Failed to broadcast submission in progress', {
        taskId,
        error: wsError instanceof Error ? wsError.message : String(wsError)
      });
      // Continue with submission process
    }
    
    // Update task with submitted status, 100% progress and metadata
    await db.update(tasks)
      .set({
        status: 'submitted',
        progress: 100,
        metadata: {
          ...task.metadata,
          submitted: true,
          submissionDate: submissionDate,
          submittedAt: submissionDate
        },
        updated_at: now
      })
      .where(eq(tasks.id, taskId));
    
    logger.info(`KY3P task ${taskId} has been marked as submitted`, {
      taskId,
      status: 'submitted',
      progress: 100,
      timestamp: submissionDate
    });
    
    // Broadcast task update
    try {
      WebSocketService.broadcast('task_update', {
        taskId,
        status: 'submitted',
        progress: 100,
        metadata: {
          submitted: true,
          submissionDate,
          submittedAt: submissionDate,
          updatedVia: 'ky3p-submission-fix',
          timestamp: now.toISOString()
        }
      });
      
      // Also broadcast form submission completed
      WebSocketService.broadcast('form_submission', {
        taskId,
        formType: 'ky3p',
        status: 'completed',
        companyId: task.company_id,
        payload: {
          message: 'KY3P form submission completed successfully',
          timestamp: now.toISOString()
        }
      });
    } catch (wsError) {
      logger.warn('Failed to broadcast task update', {
        taskId,
        error: wsError instanceof Error ? wsError.message : String(wsError)
      });
      // Continue anyway since the database update is more important
    }
    
    return res.status(200).json({
      success: true,
      message: `KY3P task ${taskId} has been successfully submitted`,
      taskId,
      status: 'submitted',
      progress: 100,
      submissionDate
    });
  } catch (error) {
    logger.error('Error processing KY3P form submission', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return res.status(500).json({
      success: false,
      message: 'An error occurred while processing the KY3P form submission',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;