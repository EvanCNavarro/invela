/**
 * Transactional Form Submission Routes
 * 
 * This module provides API routes for form submissions using the new
 * transactional form handler, ensuring atomic operations and better error handling.
 */

import { Router, Request, Response } from 'express';
import { db } from '@db';
import { tasks, files } from '@db/schema';
import { eq } from 'drizzle-orm';
import { logger } from '../utils/logger';
import { submitFormWithTransaction } from '../services/transactional-form-handler';
import * as WebSocketService from '../services/websocket';
import { broadcastFormSubmission } from '../utils/unified-websocket';
import { generateMissingFileForTask } from './fix-missing-file';

// Add namespace context to logs
const logContext = { service: 'TransactionalFormRoutes' };

/**
 * Create and export the router for transactional form submission endpoints
 */
export function createTransactionalFormRouter(): Router {
  const router = Router();
  
  /**
   * POST /api/forms-tx/submit/:formType/:taskId
   * 
   * Transactional endpoint for form submissions across all form types
   */
  router.post('/submit/:formType/:taskId', async (req: Request, res: Response) => {
    // ENHANCED LOGGING - Log every form submission attempt with request details
    console.log(`[TransactionalFormRoutes] 📬 FORM SUBMISSION START - ${new Date().toISOString()}`, {
      path: req.path,
      method: req.method,
      params: req.params,
      userPresent: !!req.user,
      userIdPresent: !!(req.user?.id),
      bodyKeys: Object.keys(req.body),
      timestamp: new Date().toISOString()
    });
    
    // Require valid user authentication
    if (!req.user || !req.user.id) {
      console.log(`[TransactionalFormRoutes] ❌ Authentication missing for submission`);
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    // Get parameters from request
    const taskId = parseInt(req.params.taskId);
    const formType = req.params.formType;
    const companyId = req.body.companyId || req.user.company_id;
    const formData = req.body;
    const userId = req.user.id;
    
    // Additional validation logging
    console.log(`[TransactionalFormRoutes] 🧾 Form submission parameters validated:`, {
      taskId,
      formType,
      companyId,
      userId,
      formDataFields: Object.keys(formData).length
    });
    
    // Validate parameters
    if (isNaN(taskId) || taskId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid task ID'
      });
    }
    
    if (!formType) {
      return res.status(400).json({
        success: false,
        message: 'Form type is required'
      });
    }
    
    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'Company ID is required'
      });
    }
    
    // Log the submission request
    logger.info(`Received form submission request`, {
      taskId,
      formType,
      userId,
      companyId,
      dataKeysCount: Object.keys(formData).length
    });
    
    // Broadcast in-progress status via WebSocket
    WebSocketService.broadcast('form_submission', {
      taskId,
      formType,
      status: 'in_progress',
      companyId,
      payload: { submissionTime: new Date().toISOString() }
    });
    
    try {
      // Process the submission transactionally
      const result = await submitFormWithTransaction({
        taskId,
        formData,
        userId,
        companyId,
        formType
      });
      
      // Handle the result
      if (!result.success) {
        // Broadcast error status via WebSocket
        WebSocketService.broadcast('form_submission', {
          taskId,
          formType,
          status: 'error',
          companyId,
          payload: { 
            error: result.error || 'Form submission failed',
            timestamp: new Date().toISOString()
          }
        });
        
        // Return error response
        return res.status(500).json({
          success: false,
          message: result.message || 'Form submission failed',
          error: result.error
        });
      }
      
      // UPDATED: Only send a single consolidated notification via form_submission_completed
      // This replaces the multiple broadcasts that were causing duplicate notifications
      
      // Define all completed actions in a single place
      const completedActions = [
        {
          type: 'form_submitted',
          description: `${formType.toUpperCase()} form submitted successfully`
        }
      ];
      
      // Add file generation action if a file was created
      if (result.fileId) {
        completedActions.push({
          type: 'file_generated',
          description: `Generated ${result.fileName || 'file'}`,
          fileId: result.fileId
        });
      }
      
      // Add tab unlocking action if tabs were unlocked
      if (result.unlockedTabs && result.unlockedTabs.length > 0) {
        completedActions.push({
          type: 'tabs_unlocked',
          description: `New Access Granted: ${result.unlockedTabs.join(', ')}`
        });
      }
      
      // Create a single timestamp for consistency
      const submissionTimestamp = new Date().toISOString();
      
      // Log detailed information to help with debugging
      logger.info(`Sending form submission completion event`, {
        taskId,
        formType,
        companyId,
        fileId: result.fileId,
        hasUnlockedTabs: result.unlockedTabs && result.unlockedTabs.length > 0,
        actionCount: completedActions.length,
        timestamp: submissionTimestamp
      });
      
      // Use the imported broadcastFormSubmission function with type='form_submission_completed'
      // This is now the single source of truth for form submission notifications
      broadcastFormSubmission({
        taskId,
        formType,
        status: 'completed',
        companyId,
        metadata: {
          fileId: result.fileId,
          fileName: result.fileName,
          unlockedTabs: result.unlockedTabs,
          completedActions,
          formSubmission: true,
          availableTabs: result.unlockedTabs,
          submissionComplete: true,
          finalCompletion: true,
          timestamp: submissionTimestamp,
          source: 'final_completion' // Explicitly mark this as the final message
        }
      });
      
      // Return success response
      return res.json({
        success: true,
        message: result.message || 'Form submitted successfully',
        fileId: result.fileId,
        fileName: result.fileName,
        unlockedTabs: result.unlockedTabs
      });
    } catch (error) {
      // Log the error
      logger.error(`Error processing form submission`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        taskId,
        formType
      });
      
      // Broadcast error status via WebSocket
      WebSocketService.broadcast('form_submission', {
        taskId,
        formType,
        status: 'error',
        companyId,
        payload: { 
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        }
      });
      
      // Return error response
      return res.status(500).json({
        success: false,
        message: 'Error processing form submission',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  /**
   * POST /api/forms-tx/fix-missing-file/:taskId
   * 
   * Fix a missing file for a submitted form
   */
  router.post('/fix-missing-file/:taskId', async (req: Request, res: Response) => {
    // Require valid user authentication
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    const taskId = parseInt(req.params.taskId);
    
    if (isNaN(taskId) || taskId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid task ID'
      });
    }
    
    logger.info(`Fixing missing file for task ${taskId}`, {
      taskId,
      userId: req.user.id
    });
    
    try {
      // Use the existing fix-missing-file implementation
      const result = await generateMissingFileForTask(taskId);
      
      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: 'Failed to fix missing file',
          error: result.error
        });
      }
      
      // Broadcast task update with file information
      WebSocketService.broadcast('task_update', {
        task: {
          id: taskId,
          status: 'submitted',
          metadata: {
            fileId: result.fileId,
            fileName: result.fileName,
            fileFixed: true,
            fileFixedAt: new Date().toISOString()
          }
        }
      });
      
      return res.json({
        success: true,
        message: `Successfully fixed missing file for task ${taskId}`,
        fileId: result.fileId,
        fileName: result.fileName
      });
    } catch (error) {
      logger.error(`Error fixing missing file for task ${taskId}`, {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return res.status(500).json({
        success: false,
        message: 'Error fixing missing file',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  /**
   * GET /api/forms-tx/check-missing-file/:taskId
   * 
   * Check if a task is missing its file
   */
  router.get('/check-missing-file/:taskId', async (req: Request, res: Response) => {
    // Require valid user authentication
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    const taskId = parseInt(req.params.taskId);
    
    if (isNaN(taskId) || taskId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid task ID'
      });
    }
    
    try {
      // Call the existing check implementation
      // (Implement similar to the check-missing-file endpoint in form-submission-routes.ts)
      // This is a simplified version
      
      // Get the task
      const task = await db.query.tasks.findFirst({
        where: eq(tasks.id, taskId)
      });
      
      if (!task) {
        return res.status(404).json({
          success: false,
          message: 'Task not found'
        });
      }
      
      // Check if task has a fileId in its metadata
      const hasFileId = task.metadata?.fileId !== undefined;
      
      // If fileId exists, verify the file exists in the files table
      let fileExists = false;
      let fileInfo = null;
      
      if (hasFileId) {
        const fileId = task.metadata?.fileId;
        const file = await db.query.files.findFirst({
          where: eq(files.id, fileId)
        });
        
        fileExists = !!file;
        if (file) {
          fileInfo = {
            id: file.id,
            name: file.name,
            status: file.status,
            created_at: file.created_at
          };
        }
      }
      
      return res.json({
        success: true,
        taskId: task.id,
        taskType: task.task_type,
        hasFileId,
        fileExists,
        needsFix: (!hasFileId || !fileExists) && task.status === 'submitted',
        fileInfo
      });
    } catch (error) {
      logger.error(`Error checking file status for task ${taskId}`, {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return res.status(500).json({
        success: false,
        message: 'Error checking file status',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  return router;
}
