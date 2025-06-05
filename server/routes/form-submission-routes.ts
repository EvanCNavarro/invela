/**
 * Unified Form Submission Routes
 * 
 * This file provides a unified interface for handling form submissions across different form types.
 * It integrates with WebSocket broadcasting to provide real-time feedback on submission status.
 */

import { Router, Request, Response } from 'express';
import { db } from '@db';
import { tasks, companies, files } from '@db/schema';
import { eq } from 'drizzle-orm';
import { logger } from '../utils/logger';
import * as fileCreation from '../services/fileCreation';
import UnifiedTabService from '../services/unified-tab-service';
import { broadcast, broadcastFormSubmission } from '../services/websocket';
import { generateMissingFileForTask, FileFixResult } from './fix-missing-file';

// Add namespace context to logs
const logContext = { service: 'FormSubmissionRoutes' };

/**
 * Helper function to forward a request to another endpoint
 */
async function forwardRequest(req: Request, res: Response, path: string): Promise<void> {
  try {
    logger.info(`Forwarding request to: ${path}`);
    
    // Call the appropriate endpoint directly
    // In a real implementation, this would be handled by an HTTP client or middleware
    req.url = path;
    req.originalUrl = path;
    
    // Use Express's next function to handle routing
    // This is not ideal but works for our purpose
    const nextHandler = (err?: any) => {
      if (err) {
        logger.error(`Error forwarding to ${path}:`, err);
        res.status(500).json({
          success: false,
          message: 'Error processing form submission',
          error: err instanceof Error ? err.message : 'Unknown error'
        });
      }
    };
    
    // Find and call the relevant handler
    const expressApp = req.app as any;
    if (expressApp._router && typeof expressApp._router.handle === 'function') {
      expressApp._router.handle(req, res, nextHandler);
    } else {
      throw new Error('Cannot access Express router handle method');
    }
    
  } catch (error) {
    logger.error(`Error setting up request forwarding to ${path}`);
    throw error;
  }
}

/**
 * Create and return the router for form submission endpoints
 */
export function createFormSubmissionRouter(): Router {
  const router = Router();
  
  /**
   * GET /api/forms/check-missing-file/:taskId
   * 
   * Check if a task is missing its file in the File Vault
   * This assists in diagnosing issues with form submissions
   */
  router.get('/check-missing-file/:taskId', async (req: Request, res: Response) => {
    // Check authentication - require valid user
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
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      
      return res.status(500).json({
        success: false,
        message: 'Error checking file status',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  /**
   * POST /api/forms/fix-missing-file/:taskId
   * 
   * Universal file regeneration endpoint that works for all form types
   * This handles the issue where a file was not properly created during form submission
   */
  router.post('/fix-missing-file/:taskId', async (req: Request, res: Response) => {
    // Check authentication - require valid user
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
      userId: req.user?.id,
      timestamp: new Date().toISOString()
    });
    
    try {
      // Call the fix function
      const result = await generateMissingFileForTask(taskId);
      
      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: 'Failed to fix missing file',
          error: result.error
        });
      }
      
      return res.json({
        success: true,
        message: `Successfully fixed missing file for task ${taskId}`,
        fileId: result.fileId,
        fileName: result.fileName
      });
    } catch (error) {
      logger.error(`Error fixing missing file for task ${taskId}`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      
      return res.status(500).json({
        success: false,
        message: 'Error fixing missing file',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  /**
   * POST /api/forms/submit/:taskType/:taskId
   * 
   * Unified endpoint for form submissions across all task types
   */
  router.post('/submit/:taskType/:taskId', async (req: Request, res: Response) => {
    const taskId = parseInt(req.params.taskId);
    const formType = req.params.taskType;
    const companyId = req.body.companyId || (req.user?.company_id || 0);
    const formData = req.body;
    
    // Enhanced logging with full context and extra debugging information
    logger.info(`[FormSubmission] 🚀 STARTING FORM SUBMISSION for task ${taskId}, type ${formType}`, {
      taskId,
      formType,
      companyId,
      userId: req.user?.id,
      timestamp: new Date().toISOString(),
      formDataSize: JSON.stringify(formData).length,
      formDataKeys: Object.keys(formData).length,
      formDataFieldCount: formData.responses ? Object.keys(formData.responses).length : 0
    });
    
    // Log environment and context for debugging
    logger.debug(`[FormSubmission] Submission context details:`, {
      headers: req.headers['content-type'],
      userAgent: req.headers['user-agent'],
      requestSize: req.headers['content-length'],
      method: req.method,
      ip: req.ip,
      path: req.path
    });
    
    try {
      // Broadcast "in progress" status via WebSocket
      await broadcastFormSubmission({
        taskId,
        formType,
        status: 'in_progress',
        companyId
      });
      
      // Check if the task exists and belongs to the user's company
      const task = await db.query.tasks.findFirst({
        where: eq(tasks.id, taskId)
      });
      
      if (!task) {
        logger.warn(`Task ${taskId} not found in database`);
        
        // Broadcast error status via WebSocket
        await broadcastFormSubmission({
          taskId,
          formType,
          status: 'error',
          companyId,
          error: 'Task not found'
        });
        
        return res.status(404).json({
          success: false,
          message: 'Task not found'
        });
      }
      
      // Determine the appropriate submission handler based on form type
      switch (formType) {
        case 'kyb':
        case 'company_kyb':
          // Redirect to KYB submission handler
          return forwardRequest(req, res, '/api/kyb/submit/' + taskId);
          
        case 'ky3p':
        case 'security_assessment':
        case 'security':
        case 'sp_ky3p_assessment':
          // Redirect to KY3P submission handler
          return forwardRequest(req, res, '/api/ky3p/submit/' + taskId);
          
        case 'open_banking':
        case 'open_banking_survey':
          // Redirect to Open Banking submission handler
          return forwardRequest(req, res, '/api/open-banking/submit/' + taskId);
          
        case 'card':
          // Redirect to Card Industry Questionnaire submission handler
          return forwardRequest(req, res, '/api/card/submit/' + taskId);
          
        default:
          logger.info(`Processing submission for form type: ${formType}`);
          
          try {
            // Update task status to submitted
            await db.update(tasks)
              .set({ 
                status: 'submitted',
                progress: 100,
                updated_at: new Date() 
              })
              .where(eq(tasks.id, taskId));
            
            // Get company info for the file
            const task = await db.query.tasks.findFirst({
              where: eq(tasks.id, taskId)
            });
            
            // Use either title from task or get company name from company record
            let companyName = 'Company';
            
            if (task) {
              // Use title as fallback for company name
              companyName = task.title || 'Company';
              
              // Try to get from company if available
              if (companyId > 0) {
                // Fetch company details if we have a company ID
                const company = await db.query.companies.findFirst({
                  where: eq(companies.id, companyId)
                });
                if (company && company.name) {
                  companyName = company.name;
                }
              }
            }
            
            // Create an actual file from the form data
            const standardizedTaskType = (formType === 'kyb' ? 'company_kyb' : 
                                         formType === 'ky3p' ? 'sp_ky3p_assessment' : 
                                         formType === 'card' ? 'company_card' :
                                         formType === 'open_banking' ? 'open_banking_survey' : 
                                         'company_kyb');
            
            const fileResult = await fileCreation.createTaskFile(
              taskId,
              standardizedTaskType,
              formData, // Use the submitted form data
              companyId,
              req.user?.id || 0
            );
            
            if (!fileResult.success) {
              logger.error(`Failed to create file for ${formType} submission:`, {
                error: fileResult.error,
                taskId,
                formType
              });
              throw new Error(`File creation failed: ${fileResult.error || 'Unknown error'}`);
            }
            
            logger.info(`File created successfully:`, {
              fileId: fileResult.fileId,
              fileName: fileResult.fileName
            });
            
            // Determine which tabs to unlock based on form type
            let unlockedTabs: string[] = [];
            
            // Set the appropriate tabs to unlock based on form type
            if (formType === 'kyb' || formType === 'company_kyb') {
              // KYB forms unlock ONLY file-vault tab - explicitly NOT dashboard
              unlockedTabs = ['file-vault'];
              logger.info('Unlocking tabs for KYB submission:', unlockedTabs);
              // CRITICAL FIX: Ensure unlockedTabs only contains 'file-vault' for KYB
              if (unlockedTabs.includes('dashboard')) {
                logger.warn('Removing dashboard from unlockedTabs for KYB form - it should not be unlocked');
                unlockedTabs = unlockedTabs.filter(tab => tab !== 'dashboard');
              }
            } else if (formType === 'ky3p' || formType === 'sp_ky3p_assessment') {
              // KY3P forms don't unlock any tabs
              unlockedTabs = [];
              logger.info('No tabs unlocked for KY3P submission');
            } else if (formType === 'open_banking' || formType === 'open_banking_survey') {
              // Open Banking forms unlock dashboard and insights
              unlockedTabs = ['dashboard', 'insights'];
              logger.info('Unlocking tabs for Open Banking submission:', unlockedTabs);
            } else if (formType === 'card' || formType === 'company_card') {
              // Card industry forms unlock dashboard
              unlockedTabs = ['dashboard'];
              logger.info('Unlocking tabs for Card submission:', unlockedTabs);
            }
            
            // Use the new unified tab service to handle all tab unlocking in a consistent way
            if (unlockedTabs.length > 0) {
              logger.info(`🔐 Form submitted - unlocking tabs for company ${companyId}:`, { tabs: unlockedTabs });
              
              try {
                // Use our unified tab service to handle tab unlocking in a standardized way
                const success = await UnifiedTabService.unlockTabs(companyId, unlockedTabs);
                
                if (success) {
                  logger.info(`✅ Successfully unlocked tabs for company ${companyId}: ${unlockedTabs.join(', ')}`);
                } else {
                  logger.warn(`⚠️ Failed to unlock tabs for company ${companyId} - UnifiedTabService.unlockTabs returned false`);
                }
              } catch (tabUnlockError) {
                logger.error(`🔴 Error unlocking tabs for company ${companyId}:`, tabUnlockError as any);
                // Continue with the form submission even if tab unlock fails
              }
            } else {
              logger.info(`No tabs to unlock for form type ${formType}`);
            }
            
            // CRITICAL FIX: Explicitly broadcast the company tabs update as a separate event
            // This ensures the tab update event is sent regardless of whether clients are listening
            // for form submission events
            if (unlockedTabs.length > 0) {
              logger.info(`Broadcasting tabs update completed via UnifiedTabService`);
              // The UnifiedTabService.unlockTabs method already handles tab broadcasting
              // No need for additional broadcasting here
            }
            
            // Define completed actions for better organization
            const completedActions = [
              {
                type: 'form_submitted',
                description: `${formType.toUpperCase()} form submitted successfully`
              },
              {
                type: 'file_generated',
                description: `Generated ${fileResult.fileName}`,
                fileId: fileResult.fileId
              },
              ...(unlockedTabs && unlockedTabs.length > 0 ? [{
                type: 'tabs_unlocked',
                description: `Unlocked tabs: ${unlockedTabs.join(', ')}`
              }] : [])
            ];
            
            // Broadcast form submission success via WebSocket with file info and unlocked tabs
            await broadcastFormSubmission({
              taskId,
              formType,
              status: 'success',
              companyId,
              unlockedTabs,
              fileName: fileResult.fileName,
              fileId: fileResult.fileId,
              completedActions
            });
            
            return res.json({
              success: true,
              message: `Form submitted successfully (${formType})`,
              taskId,
              formType,
              status: 'submitted',
              fileId: fileResult.fileId,
              fileName: fileResult.fileName,
              // CRITICAL FIX: Include unlockedTabs in the API response
              unlockedTabs,
              // CRITICAL FIX: Include submissionDate in the API response
              submissionDate: new Date().toISOString()
            });
          } catch (fileError) {
            logger.error(`Error creating file for ${formType} submission:`, fileError as any);
            throw fileError; // Let the outer catch block handle this
          }
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Error processing form submission for task ${taskId}: ${errorMessage}`);
      
      // Broadcast error status via WebSocket
      await broadcastFormSubmission({
        taskId,
        formType,
        status: 'error',
        companyId,
        error: error instanceof Error ? error.message : 'Unknown submission error'
      });
      
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'An error occurred during form submission',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  return router;
}