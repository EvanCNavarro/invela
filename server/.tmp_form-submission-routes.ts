/**
 * Unified Form Submission Routes
 * 
 * This file provides a unified interface for handling form submissions across different form types.
 * It integrates with WebSocket broadcasting to provide real-time feedback on submission status.
 */

import { Router, Request, Response } from 'express';
import { 
  broadcastFormSubmission, 
  broadcastCompanyTabsUpdate,
  broadcastTaskUpdate
} from '../services/websocket';
import { db } from '@db';
import { tasks } from '@db/schema';
import { eq } from 'drizzle-orm';
import getLogger from '../utils/logger';
import fileCreationService from '../services/fileCreation';

const logger = getLogger('FormSubmissionRoutes');

/**
 * Create and return the router for form submission endpoints
 */
export function createFormSubmissionRouter(): Router {
  const router = Router();
  
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
    
    logger.info(`Unified form submission received for task ${taskId}, type ${formType}`, {
      taskId,
      formType,
      companyId,
      timestamp: new Date().toISOString()
    });
    
    try {
      // Broadcast "in progress" status via WebSocket
      broadcastFormSubmission(
        taskId, 
        formType, 
        'in_progress', 
        companyId, 
        { submissionDate: new Date().toISOString() }
      );
      
      // Check if the task exists and belongs to the user's company
      const task = await db.query.tasks.findFirst({
        where: eq(tasks.id, taskId)
      });
      
      if (!task) {
        logger.warn(`Task ${taskId} not found in database`);
        
        // Broadcast error status via WebSocket
        broadcastFormSubmission(
          taskId, 
          formType, 
          'error', 
          companyId, 
          { 
            error: 'Task not found',
            submissionDate: new Date().toISOString()
          }
        );
        
        return res.status(404).json({
          success: false,
          message: 'Task not found'
        });
      }
      
      // Determine the appropriate submission handler based on form type
      let result;
      
      switch (formType) {
        case 'kyb':
        case 'company_kyb':
          // Redirect to KYB submission handler
          return forward(req, res, '/api/kyb/submit/' + taskId);
          
        case 'ky3p':
        case 'security_assessment':
        case 'security':
        case 'sp_ky3p_assessment':
          // Redirect to KY3P submission handler
          return forward(req, res, '/api/ky3p/submit/' + taskId);
          
        case 'open_banking':
        case 'open_banking_survey':
          // Redirect to Open Banking submission handler
          return forward(req, res, '/api/open-banking/submit/' + taskId);
          
        case 'card':
          // Redirect to Card Industry Questionnaire submission handler
          return forward(req, res, '/api/card/submit/' + taskId);
          
        default:
          logger.info(`Processing submission for form type: ${formType}`);
          
          try {
            // Import the fileCreationService
            const { fileCreationService } = await import('../services/fileCreation');
            
            // Update task status to submitted
            await db.update(tasks)
              .set({ 
                status: 'submitted',
                progress: 100,
                updated_at: new Date() 
              })
              .where(eq(tasks.id, taskId));
            
            // Get company info for the file
            const [company] = await db.select({
              name: tasks.company_name
            })
            .from(tasks)
            .where(eq(tasks.id, taskId));
            
            const companyName = company?.name || 'Company';
            
            // Create an actual file from the form data
            const fileResult = await fileCreationService.createTaskFile(
              req.user?.id || 0,
              companyId,
              formData, // Use the submitted form data
              {
                taskType: formType,
                taskId,
                companyName
              }
            );
            
            if (!fileResult.success) {
              logger.error(`Failed to create file for ${formType} submission:`, fileResult.error);
              throw new Error(`File creation failed: ${fileResult.error?.message || 'Unknown error'}`);
            }
            
            logger.info(`File created successfully:`, {
              fileId: fileResult.fileId,
              fileName: fileResult.fileName
            });
            
            // Determine which tabs to unlock based on form type
            let unlockedTabs: string[] = [];
            
            // Set the appropriate tabs to unlock based on form type
            if (formType === 'kyb' || formType === 'company_kyb') {
              // KYB forms unlock file-vault and dashboard
              unlockedTabs = ['file-vault', 'dashboard'];
              logger.info('Unlocking tabs for KYB submission:', unlockedTabs);
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
            
            // If there are tabs to unlock, broadcast a company tabs update
            if (unlockedTabs.length > 0) {
              logger.info(`Broadcasting company tabs update for company ${companyId}:`, unlockedTabs);
              
              // Broadcast the company tabs update first
              broadcastCompanyTabsUpdate(
                companyId,
                unlockedTabs
              );
            }
            
            // Broadcast form submission success via WebSocket with file info and unlocked tabs
            broadcastFormSubmission(
              taskId, 
              formType, 
              'success', 
              companyId, 
              { 
                submissionDate: new Date().toISOString(),
                unlockedTabs,
                fileName: fileResult.fileName,
                fileId: fileResult.fileId
              }
            );
            
            return res.json({
              success: true,
              message: `Form submitted successfully (${formType})`,
              taskId,
              formType,
              status: 'submitted',
              fileId: fileResult.fileId,
              fileName: fileResult.fileName
            });
          } catch (fileError) {
            logger.error(`Error creating file for ${formType} submission:`, fileError);
            throw fileError; // Let the outer catch block handle this
          }
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Error processing form submission for task ${taskId}: ${errorMessage}`);
      
      // Broadcast error status via WebSocket
      broadcastFormSubmission(
        taskId, 
        formType, 
        'error', 
        companyId, 
        { 
          error: error instanceof Error ? error.message : 'Unknown submission error',
          submissionDate: new Date().toISOString()
        }
      );
      
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'An error occurred during form submission',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  return router;
}

/**
 * Helper function to forward a request to another endpoint
 */
async function forward(req: Request, res: Response, path: string): Promise<void> {
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