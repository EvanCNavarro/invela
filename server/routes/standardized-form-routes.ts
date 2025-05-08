/**
 * Standardized Form Routes
 * 
 * This module provides standardized routes for form submissions to ensure consistent
 * behavior across all form types. It integrates with the standardized submission handler
 * to provide a uniform approach to status updates and progress indicators.
 */

import { Router, Request, Response } from 'express';
import { db } from '@db';
import { tasks } from '@db/schema';
import { eq } from 'drizzle-orm';
import { logger } from '../utils/logger';
import { submitFormStandardized } from '../services/standardized-submission-handler';
import { requireAuth } from '../middleware/auth';
import { mapClientFormTypeToSchemaType } from '../utils/form-type-mapper';

// Create router
const router = Router();

/**
 * Universal Form Submission Endpoint
 * 
 * This endpoint handles submissions for all form types in a standardized way.
 * It ensures that status is set to 'submitted' and progress to 100% consistently.
 */
router.post('/api/forms/submit/:formType/:taskId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { taskId: taskIdParam, formType: formTypeParam } = req.params;
    const taskId = parseInt(taskIdParam, 10);
    const formType = formTypeParam?.toLowerCase();
    const { formData, fileName } = req.body;
    
    if (!formType) {
      return res.status(400).json({
        success: false,
        error: 'Form type is required'
      });
    }
    
    if (isNaN(taskId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid task ID'
      });
    }
    
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }
    
    // Fetch the task to get company ID
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId)
    });
    
    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }
    
    // Log the submission request
    logger.info(`[StandardizedFormRoutes] Received form submission request`, {
      taskId,
      formType,
      userId: req.user.id,
      companyId: task.company_id,
      fieldCount: formData ? Object.keys(formData).length : 0
    });
    
    // Process the form submission using our standardized handler
    const result = await submitFormStandardized({
      taskId,
      userId: req.user.id,
      companyId: task.company_id,
      formData: formData || {},
      formType,
      fileName
    });
    
    if (result.success) {
      // Return successful response
      return res.status(200).json({
        success: true,
        message: 'Form submitted successfully',
        taskId,
        status: result.status,
        progress: result.progress,
        fileId: result.fileId,
        submissionDate: result.submissionDate,
        warnings: result.warnings
      });
    } else {
      // Log the error
      logger.error(`[StandardizedFormRoutes] Form submission failed`, {
        taskId,
        formType,
        error: result.error
      });
      
      // Return error response
      return res.status(500).json({
        success: false,
        error: result.error || 'Unknown error processing form submission'
      });
    }
  } catch (error) {
    // Log unexpected errors
    logger.error(`[StandardizedFormRoutes] Unexpected error processing form submission`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      path: req.path,
      params: req.params
    });
    
    // Return error response
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unexpected error processing form submission'
    });
  }
});

/**
 * Legacy compatibility route
 * 
 * This route provides backward compatibility with the old submission endpoints.
 */
router.post('/api/forms/submit-form', requireAuth, async (req: Request, res: Response) => {
  try {
    const { taskId, formType } = req.body;
    
    // Redirect to the new standardized endpoint
    return res.redirect(307, `/api/forms/submit/${formType}/${taskId}`);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unexpected error'
    });
  }
});

// Export router
export default router;