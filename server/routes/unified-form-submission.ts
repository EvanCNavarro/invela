/**
 * Unified Form Submission Routes
 * 
 * This module provides a centralized endpoint for all form submissions,
 * supporting different form types (KYB, KY3P, Open Banking).
 */

import { Request, Response, Router } from 'express';
import { broadcast, broadcastFormSubmission } from '../services/websocket';
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
   * POST /api/form-submission/submit/:formType/:taskId
   * 
   * Submit a form for processing
   */
  router.post(['/', '/submit/:formType/:taskId'], requireAuth, async (req: Request, res: Response) => {
    try {
      // Set correct content-type for response
      res.setHeader('Content-Type', 'application/json');
      
      // Get values from either URL params or request body
      const taskId = req.params.taskId ? parseInt(req.params.taskId) : (req.body.taskId || 0);
      const formType = req.params.formType || req.body.formType;
      const { formData, metadata } = req.body;
      
      console.log(`[FormSubmission] Request received: path params:`, { 
        pathTaskId: req.params.taskId,
        pathFormType: req.params.formType
      });
      console.log(`[FormSubmission] Request body:`, {
        bodyTaskId: req.body.taskId,
        bodyFormType: req.body.formType,
        formDataKeysCount: formData ? Object.keys(formData).length : 0
      });
      
      if (!taskId || !formType || !formData) {
        console.error(`[FormSubmission] Missing required fields: taskId=${taskId}, formType=${formType}, formData=${!!formData}`);
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: taskId, formType, or formData'
        });
      }
      
      console.log(`[FormSubmission] Received ${formType} submission for task ${taskId}`);
      console.log(`[FormSubmission] Form data keys: ${Object.keys(formData).length} fields included`);
      console.log(`[FormSubmission] Additional metadata: ${JSON.stringify(metadata || {})}`);
      
      // Check task status before processing
      const [task] = await db.select({
        id: tasks.id,
        status: tasks.status,
        company_id: tasks.company_id
      })
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1);
      
      console.log(`[FormSubmission] Task found: ${task ? 'Yes' : 'No'}, Status: ${task?.status}, CompanyID: ${task?.company_id}`);
      
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
      
      // Broadcast submission status update via WebSocket using enhanced function
      broadcastFormSubmission(
        taskId,
        formType,
        'success',
        task.company_id || 0, // Ensure company_id is never null
        {
          submissionDate: new Date().toISOString(),
          unlockedTabs: ['file-vault', 'dashboard'],
          fileName,
          fileId
        }
      );
      
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
      
      // Broadcast error event if we have the taskId and formType using enhanced function
      if (req.body.taskId && req.body.formType) {
        broadcastFormSubmission(
          req.body.taskId,
          req.body.formType,
          'error',
          req.user?.company_id || 0,
          { error: errorMessage }
        );
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
   * GET /api/form-submission/status/:formType/:taskId
   * 
   * Check the status of a form submission
   */
  router.get(['/status/:taskId', '/status/:formType/:taskId'], requireAuth, async (req: Request, res: Response) => {
    try {
      // Set correct content-type for response
      res.setHeader('Content-Type', 'application/json');
      
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
      // Set correct content-type for response
      res.setHeader('Content-Type', 'application/json');
      
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
      
      // Broadcast submission success event using enhanced function
      broadcastFormSubmission(
        taskId,
        formType,
        'success',
        task.company_id || 0, // Ensure company_id is never null
        {
          submissionDate: new Date().toISOString(),
          unlockedTabs: ['file-vault', 'dashboard'],
          fileName,
          fileId
        }
      );
      
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