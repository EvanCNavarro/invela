/**
 * Unified Form Submission Router
 * 
 * This router handles form submissions for all form types (KYB, KY3P, Open Banking)
 * using a unified approach with consistent error handling, transaction management,
 * and WebSocket notifications.
 */

import { Router } from 'express';
import { performance } from 'perf_hooks';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from '../middleware/auth';
import { logger } from '../utils/logger';
import { processFormSubmission, broadcastFormSubmissionEvent } from '../services/unified-form-submission-handler';

const router = Router();

/**
 * POST /api/submit-form/:formType/:taskId
 * Unified form submission endpoint for any form type
 */
router.post('/api/submit-form/:formType/:taskId', requireAuth, async (req, res) => {
  const startTime = performance.now();
  const transactionId = uuidv4();
  
  try {
    // Extract parameters
    const { formType, taskId: taskIdParam } = req.params;
    const { formData, fileName } = req.body;
    const taskId = parseInt(taskIdParam);
    
    // Log submission attempt
    logger.info(`[${formType.toUpperCase()} Submission] Processing form submission`, {
      transactionId,
      taskId,
      formType,
      userId: req.user?.id,
      hasFormData: !!formData,
      timestamp: new Date().toISOString()
    });
    
    // Validate form type
    if (!['kyb', 'ky3p', 'open_banking'].includes(formType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid form type',
        message: `Form type must be one of: kyb, ky3p, open_banking. Received: ${formType}`
      });
    }
    
    // Verify user is authenticated before proceeding
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ 
        success: false,
        error: 'Unauthorized', 
        message: 'You must be logged in to submit form data',
        details: {
          authenticated: req.isAuthenticated(),
          hasUser: !!req.user,
          hasSession: !!req.session,
          timestamp: new Date().toISOString()
        }
      });
    }
    
    // Validate taskId
    if (isNaN(taskId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid task ID',
        message: 'The task ID must be a valid number'
      });
    }
    
    // Validate form data exists
    if (!formData || Object.keys(formData).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing form data',
        message: 'Form data is required for submission'
      });
    }
    
    // Call the unified form submission handler
    const submissionResult = await processFormSubmission({
      formType: formType as 'kyb' | 'ky3p' | 'open_banking',
      taskId,
      formData,
      fileName,
      userId: req.user?.id,
      transactionId,
      startTime
    });
    
    // If submission was successful
    if (submissionResult.success) {
      logger.info(`[${formType.toUpperCase()} Submission] Submission successful`, {
        transactionId,
        taskId,
        fileId: submissionResult.fileId,
        elapsedMs: submissionResult.elapsedMs
      });
      
      // Broadcast the submission to clients via WebSocket
      try {
        // Create metadata for the broadcast
        const metadata = {
          transactionId,
          warnings: submissionResult.warnings?.length || 0,
          ...getFormSpecificMetadata(formType, submissionResult)
        };
        
        // Send the broadcast via WebSocket
        const broadcasted = await broadcastFormSubmissionEvent(
          taskId,
          formType as 'kyb' | 'ky3p' | 'open_banking',
          submissionResult.companyId as number,
          submissionResult.fileId,
          metadata
        );
        
        logger.info(`[${formType.toUpperCase()} Submission] Broadcast results`, {
          success: true, // broadcastFormSubmissionEvent doesn't return a boolean
          taskId,
          transactionId
        });
      } catch (error) {
        logger.error(`[${formType.toUpperCase()} Submission] Broadcast error`, {
          error: error instanceof Error ? error.message : 'Unknown error',
          taskId,
          transactionId
        });
        // Continue processing even if broadcast fails
      }
      
      // Return success response
      return res.json({
        success: true,
        fileId: submissionResult.fileId,
        warnings: submissionResult.warnings,
        ...getFormSpecificResponse(formType, submissionResult),
        elapsedMs: submissionResult.elapsedMs
      });
    } else {
      // Transaction failed
      logger.error(`[${formType.toUpperCase()} Submission] Transaction failed`, {
        error: submissionResult.error,
        taskId,
        transactionId
      });
      
      return res.status(500).json({
        success: false,
        error: `Failed to process ${formType} submission`,
        details: submissionResult.error || 'Unknown error during transaction processing',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    // Enhanced error logging
    logger.error(`[Form Submission] Unhandled error`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      transactionId,
      timestamp: new Date().toISOString()
    });
    
    // Set appropriate status code based on error type
    const statusCode = 
      error instanceof Error && error.message.includes('Unauthorized') ? 401 :
      error instanceof Error && error.message.includes('not found') ? 404 : 
      error instanceof Error && error.message.includes('duplicate key') ? 409 : 500;
    
    // Send detailed error response
    res.status(statusCode).json({
      success: false,
      error: 'Failed to submit form data',
      details: error instanceof Error ? error.message : 'Unknown error',
      statusCode,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Generate form-specific metadata for WebSocket broadcasts
 */
function getFormSpecificMetadata(formType: string, result: any): Record<string, any> {
  switch (formType) {
    case 'kyb':
      return {
        securityTasksUnlocked: result.securityTasksUnlocked || 0
      };
    case 'ky3p':
      return {
        riskScoreUpdated: result.riskScoreUpdated || false
      };
    case 'open_banking':
      return {
        dashboardUnlocked: result.dashboardUnlocked || false
      };
    default:
      return {};
  }
}

/**
 * Generate form-specific response data
 */
function getFormSpecificResponse(formType: string, result: any): Record<string, any> {
  switch (formType) {
    case 'kyb':
      return {
        securityTasksUnlocked: result.securityTasksUnlocked || 0
      };
    case 'ky3p':
      return {
        riskScoreUpdated: result.riskScoreUpdated || false
      };
    case 'open_banking':
      return {
        dashboardUnlocked: result.dashboardUnlocked || false
      };
    default:
      return {};
  }
}

// Export both the router and a function to create the router
export default router;

/**
 * Create a new unified form submission router
 * This function is used by the main routes file to register the router
 */
export function createUnifiedFormSubmissionRouter() {
  return router;
}
