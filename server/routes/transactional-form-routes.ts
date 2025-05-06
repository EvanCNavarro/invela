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
    // Require valid user authentication
    if (!req.user || !req.user.id) {
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
      
      // Broadcast success status via WebSocket with file and tab info
      WebSocketService.broadcast('form_submission', {
        taskId,
        formType,
        status: 'success',
        companyId,
        payload: {
          fileId: result.fileId,
          fileName: result.fileName,
          unlockedTabs: result.unlockedTabs,
          submissionTime: new Date().toISOString(),
          completedActions: [
            {
              type: 'form_submitted',
              description: `${formType.toUpperCase()} form submitted successfully`
            },
            {
              type: 'file_generated',
              description: `Generated ${result.fileName}`,
              fileId: result.fileId
            },
            ...(result.unlockedTabs && result.unlockedTabs.length > 0 ? [{
              type: 'tabs_unlocked',
              description: `Unlocked tabs: ${result.unlockedTabs.join(', ')}`
            }] : [])
          ]
        }
      });
      
      // Also broadcast a task update to ensure clients know the task status is "submitted"
      WebSocketService.broadcastTaskUpdate(taskId, 100, 'submitted', {
        fileId: result.fileId,
        taskType: formType,
        submissionTime: new Date().toISOString()
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
