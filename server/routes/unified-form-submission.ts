/**
 * Unified Form Submission Routes
 * 
 * This file provides transaction-based form submission routes that ensure atomic operations
 * for form submissions across all form types. It uses the unified form submission service
 * to handle the submission process with proper error handling and WebSocket notifications.
 */

import { Router, Request, Response } from 'express';
import { logger } from '../utils/logger';
import { submitForm, FormType } from '../services/unified-form-submission-service';

// Create a context object for logging
const logContext = { service: 'UnifiedFormSubmissionRoutes' };

/**
 * Create and return the router for unified form submission endpoints
 */
export function createUnifiedFormSubmissionRouter(): Router {
  const router = Router();
  
  /**
   * POST /api/unified-form/submit/:formType/:taskId
   * 
   * Submit a form with transaction-based consistency
   */
  router.post('/submit/:formType/:taskId', async (req: Request, res: Response) => {
    // User must be authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    const taskId = parseInt(req.params.taskId);
    const formType = req.params.formType as FormType;
    const userId = req.user.id;
    const companyId = req.body.companyId || req.user.company_id;
    const formData = req.body;
    const fileName = req.body.fileName;
    
    // Validate parameters
    if (isNaN(taskId) || taskId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid task ID'
      });
    }
    
    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'Company ID is required'
      });
    }
    
    // Log starting the form submission
    logger.info('Starting unified form submission', {
      ...logContext,
      taskId,
      formType,
      userId,
      companyId,
      fieldCount: Object.keys(formData).length
    });
    
    try {
      // Submit the form using the unified form submission service
      const result = await submitForm(
        taskId,
        formData,
        formType,
        userId,
        companyId,
        fileName
      );
      
      if (!result.success) {
        logger.error('Form submission failed', {
          ...logContext,
          taskId,
          formType,
          error: result.error
        });
        
        return res.status(500).json({
          success: false,
          message: 'Error submitting form',
          error: result.error
        });
      }
      
      // Generate a user-friendly message based on form type
      let message = 'Form submitted successfully';
      
      if (formType === 'kyb' || formType === 'company_kyb') {
        message += ' and File Vault tab is now accessible.';
      } else if (formType === 'open_banking') {
        message += ' and Dashboard and Insights tabs are now accessible.';
      }
      
      logger.info('Form submitted successfully', {
        ...logContext,
        taskId,
        formType,
        fileId: result.fileId,
        unlockedTabs: result.unlockedTabs
      });
      
      return res.json({
        success: true,
        message,
        fileId: result.fileId,
        fileName: result.fileName,
        unlockedTabs: result.unlockedTabs
      });
    } catch (error) {
      logger.error('Error in unified form submission', {
        ...logContext,
        taskId,
        formType,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      
      return res.status(500).json({
        success: false,
        message: 'Error submitting form',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  return router;
}

export default createUnifiedFormSubmissionRouter;
