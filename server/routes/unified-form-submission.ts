/**
 * Unified Form Submission Routes
 * 
 * This module provides a centralized endpoint for all form submissions,
 * supporting different form types (KYB, KY3P, Open Banking).
 */

import { Request, Response, Router } from 'express';
import { broadcast } from '../services/websocket';
import { db } from '@db';
import { tasks, TaskStatus } from '@db/schema';
import { eq, and } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth';

/**
 * Create the router for unified form submission
 */
export function createUnifiedFormSubmissionRouter(): Router {
  const router = Router();

  /**
   * POST /api/form-submission
   * 
   * Submit a form for processing
   */
  router.post('/', requireAuth, async (req: Request, res: Response) => {
    try {
      const { taskId, formType, formData, metadata } = req.body;
      
      if (!taskId || !formType || !formData) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: taskId, formType, or formData'
        });
      }
      
      console.log(`[FormSubmission] Received ${formType} submission for task ${taskId}`);
      
      // Check task status before processing
      const [task] = await db.select({
        id: tasks.id,
        status: tasks.status,
        company_id: tasks.company_id
      })
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1);
      
      if (!task) {
        return res.status(404).json({
          success: false,
          message: 'Task not found'
        });
      }
      
      // Update task status to 'submitted'
      await db.update(tasks)
        .set({
          status: 'submitted',
          updated_at: new Date()
        })
        .where(eq(tasks.id, taskId));
      
      // Simulating file generation
      const fileName = `${formType}-submission-${taskId}.csv`;
      const fileId = Math.floor(Math.random() * 10000) + 1; // Simulated file ID
      
      // Broadcast submission status update via WebSocket
      broadcast('form_submitted', {
        taskId,
        formType,
        status: 'success',
        companyId: task.company_id,
        submissionDate: new Date().toISOString(),
        unlockedTabs: ['file-vault', 'dashboard'],
        fileName,
        fileId
      });
      
      // Return success response
      res.json({
        success: true,
        message: 'Form submitted successfully',
        taskId,
        formType,
        submissionDate: new Date().toISOString(),
        status: 'submitted',
        fileName,
        fileId,
        unlockedTabs: ['file-vault', 'dashboard']
      });
    } catch (error) {
      console.error('[FormSubmission] Error processing submission:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Broadcast error event if we have the taskId and formType
      if (req.body.taskId && req.body.formType) {
        broadcast('form_submitted', {
          taskId: req.body.taskId,
          formType: req.body.formType,
          status: 'error',
          companyId: req.user?.company_id || 0,
          error: errorMessage
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error processing form submission',
        error: errorMessage
      });
    }
  });

  /**
   * GET /api/form-submission/status/:taskId
   * 
   * Check the status of a form submission
   */
  router.get('/status/:taskId', requireAuth, async (req: Request, res: Response) => {
    try {
      const taskId = parseInt(req.params.taskId);
      
      if (isNaN(taskId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid task ID'
        });
      }
      
      // Check if a submission is in progress
      const [task] = await db.select({
        id: tasks.id,
        status: tasks.status
      })
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1);
      
      if (!task) {
        return res.status(404).json({
          success: false,
          message: 'Task not found'
        });
      }
      
      // Return task submission status
      res.json({
        success: true,
        inProgress: task.status === 'in_progress',
        taskId
      });
    } catch (error) {
      console.error('[FormSubmission] Error checking submission status:', error);
      res.status(500).json({
        success: false,
        message: 'Error checking submission status',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * POST /api/form-submission/retry/:taskId
   * 
   * Retry a failed form submission
   */
  router.post('/retry/:taskId', requireAuth, async (req: Request, res: Response) => {
    try {
      const taskId = parseInt(req.params.taskId);
      const { formType } = req.body;
      
      if (isNaN(taskId) || !formType) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: taskId or formType'
        });
      }
      
      // Check if task exists
      const [task] = await db.select({
        id: tasks.id,
        company_id: tasks.company_id
      })
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1);
      
      if (!task) {
        return res.status(404).json({
          success: false,
          message: 'Task not found'
        });
      }
      
      // Simulate retry success
      const fileName = `${formType}-submission-${taskId}-retry.csv`;
      const fileId = Math.floor(Math.random() * 10000) + 1000; // Simulated file ID
      
      // Broadcast submission success event
      broadcast('form_submitted', {
        taskId,
        formType,
        status: 'success',
        companyId: task.company_id,
        submissionDate: new Date().toISOString(),
        unlockedTabs: ['file-vault', 'dashboard'],
        fileName,
        fileId
      });
      
      // Return success response
      res.json({
        success: true,
        message: 'Form submission retry successful',
        taskId,
        formType,
        submissionDate: new Date().toISOString(),
        fileName,
        fileId,
        unlockedTabs: ['file-vault', 'dashboard']
      });
    } catch (error) {
      console.error('[FormSubmission] Error retrying submission:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrying form submission',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  return router;
}