/**
 * Unified Form Submission Routes
 * 
 * This file provides a unified interface for handling form submissions across different form types.
 * It integrates with WebSocket broadcasting to provide real-time feedback on submission status.
 */

import { Router, Request, Response } from 'express';
import websocketService from '../services/websocket';
import { db } from '@db';
import { tasks, companies } from '@db/schema';
import { eq } from 'drizzle-orm';
import getLogger from '../utils/logger';
import { fileCreationService } from '../services/fileCreation';

// Destructure websocket service functions
const { 
  broadcastFormSubmission, 
  broadcastCompanyTabsUpdate, 
  broadcastTaskUpdate 
} = websocketService;

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
            const fileResult = await fileCreationService.createTaskFile(
              req.user?.id || 0,
              companyId,
              formData, // Use the submitted form data
              {
                // Use a safe type conversion to ensure compatibility with FileCreationService
                taskType: (formType === 'kyb' ? 'company_kyb' : 
                          formType === 'ky3p' ? 'sp_ky3p_assessment' : 
                          formType === 'card' ? 'company_card' : 'company_kyb'),
                taskId,
                companyName,
                additionalData: { originalType: formType }
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
              // KYB forms unlock ONLY file-vault tab - explicitly NOT dashboard
              unlockedTabs = ['file-vault'];
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
            
            // If there are tabs to unlock, update the company record and broadcast the update
            if (unlockedTabs.length > 0) {
              logger.info(`Updating and broadcasting company tabs for company ${companyId}:`, unlockedTabs);
              
              try {
                // First, get the current company data
                const company = await db.query.companies.findFirst({
                  where: eq(companies.id, companyId)
                });
                
                if (company) {
                  // Get current available_tabs or initialize empty array
                  let currentTabs: string[] = [];
                  
                  try {
                    if (company.available_tabs) {
                      // Handle available_tabs, which can be a PostgreSQL text array or JSON string
                      if (Array.isArray(company.available_tabs)) {
                        // It's already an array, use it directly
                        currentTabs = company.available_tabs;
                        logger.info(`Using existing array tabs for company ${companyId}:`, {tabs: currentTabs});
                      } else if (typeof company.available_tabs === 'string') {
                        try {
                          // Try to parse as JSON string
                          currentTabs = JSON.parse(company.available_tabs);
                          logger.info(`Parsed JSON string tabs for company ${companyId}:`, {tabs: currentTabs});
                        } catch (innerParseError) {
                          logger.warn(`Error parsing JSON available_tabs for company ${companyId}, trying PostgreSQL array format`);
                          
                          // If JSON parsing fails, it might be a PostgreSQL array string format like "{tab1,tab2}"
                          // Remove the curly braces and split by comma
                          const pgArrayStr = company.available_tabs.trim();
                          if (pgArrayStr.startsWith('{') && pgArrayStr.endsWith('}')) {
                            const innerStr = pgArrayStr.substring(1, pgArrayStr.length - 1);
                            currentTabs = innerStr.split(',').map(s => s.trim());
                            logger.info(`Parsed PostgreSQL array tabs for company ${companyId}:`, {tabs: currentTabs});
                          }
                        }
                      }
                    }
                  } catch (parseError) {
                    logger.warn(`Error handling available_tabs for company ${companyId}:`, {error: parseError instanceof Error ? parseError.message : 'Unknown error'});
                    // Continue with empty array if parsing fails
                    currentTabs = [];
                  }
                  
                  // Add new tabs if they're not already included
                  const updatedTabs = [...new Set([...currentTabs, ...unlockedTabs])];
                  logger.info(`Updating company ${companyId} tabs from [${currentTabs.join(', ')}] to [${updatedTabs.join(', ')}]`);
                  
                  // Update the company record with the new tabs
                  // Store as a native PostgreSQL array instead of JSON string
                  await db.update(companies)
                    .set({ 
                      available_tabs: updatedTabs, // Store directly as array
                      updated_at: new Date()
                    })
                    .where(eq(companies.id, companyId));
                  
                  logger.info(`Successfully updated available tabs for company ${companyId}`);
                  
                  // Broadcast the company tabs update
                  broadcastCompanyTabsUpdate(
                    companyId,
                    updatedTabs
                  );
                } else {
                  logger.warn(`Company ${companyId} not found, skipping tab update`);
                }
              } catch (dbError) {
                logger.error(`Error updating company tabs for company ${companyId}:`, dbError);
                // Continue with the form submission even if tab update fails
              }
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
                fileId: fileResult.fileId,
                // Add completed actions array to match what UniversalSuccessModal expects
                completedActions: [
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
                ]
              }
            );
            
            // Also broadcast with the form_submitted event type for compatibility
            broadcastMessage('form_submitted', {
              taskId,
              formType,
              status: 'success',
              companyId,
              submissionDate: new Date().toISOString(),
              unlockedTabs,
              fileName: fileResult.fileName,
              fileId: fileResult.fileId,
              completedActions: [
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
              ]
            });
            
            // CRITICAL FIX: Explicitly broadcast the company tabs update as a separate event
            // This ensures the tab update event is sent regardless of whether clients are listening
            // for form submission events
            if (unlockedTabs.length > 0) {
              try {
                logger.info(`Broadcasting company_tabs_update for company ${companyId} with new tabs: ${unlockedTabs.join(', ')}`);
                
                // Import the correct function to broadcast company tabs update
                const { broadcastCompanyTabsUpdate } = require('../services/websocket');
                
                // Get the current tabs from the database again to ensure accuracy
                const [companyRecord] = await db.select()
                  .from(companies)
                  .where(eq(companies.id, companyId));
                  
                if (companyRecord && companyRecord.available_tabs) {
                  // Handle the available_tabs field, which is a text array in PostgreSQL
                  // It's already an array of strings, so we can use it directly
                  let currentTabsFromDb: string[] = Array.isArray(companyRecord.available_tabs) 
                    ? companyRecord.available_tabs 
                    : [];
                  
                  logger.info(`Broadcasting tabs from database: ${currentTabsFromDb.join(', ')}`);
                  
                  // Broadcast with the tabs directly from the database
                  broadcastCompanyTabsUpdate(
                    companyId,
                    currentTabsFromDb
                  );
                } else {
                  // Fallback to just using unlockedTabs
                  broadcastCompanyTabsUpdate(
                    companyId, 
                    unlockedTabs
                  );
                }
                
                logger.info(`Successfully broadcasted company tabs update for company ${companyId}`);
              } catch (wsError) {
                logger.error(`Error broadcasting company tabs update: ${wsError instanceof Error ? wsError.message : 'Unknown error'}`);
                // Don't throw here - we don't want a WebSocket error to prevent form submission
              }
            }
            
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