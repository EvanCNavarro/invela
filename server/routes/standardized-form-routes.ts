/**
 * Standardized Form Routes
 * 
 * This module provides unified API route handlers for form submissions across
 * different form types. It ensures consistent behavior and error handling.
 */

import { Router, Request, Response } from 'express';
import { db } from '@db';
import { tasks } from '@db/schema';
import { and, eq } from 'drizzle-orm';
import { logger } from '../utils/logger';
import { handleFormSubmission, FormSubmissionInput } from '../services/standardized-submission-handler';
import { mapClientFormTypeToSchemaType } from '../utils/form-type-mapper';

const router = Router();

/**
 * Submit a form
 * 
 * This endpoint handles form submissions for all form types (KYB, KY3P, Open Banking)
 * using the standardized form submission handler.
 * 
 * @route POST /api/forms/:formType/submit
 */
router.post('/:formType/submit', async (req: Request, res: Response) => {
  const { formType } = req.params;
  const { taskId, formData } = req.body;
  
  if (!taskId) {
    return res.status(400).json({
      success: false,
      error: 'taskId is required'
    });
  }
  
  if (!formData) {
    return res.status(400).json({
      success: false,
      error: 'formData is required'
    });
  }
  
  try {
    // Validate form type
    try {
      mapClientFormTypeToSchemaType(formType);
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: `Invalid form type: ${formType}`
      });
    }
    
    // Get the task to verify ownership and get company ID
    const task = await db.query.tasks.findFirst({
      where: and(
        eq(tasks.id, parseInt(taskId.toString(), 10)),
        ...(req.user ? [eq(tasks.user_id, req.user.id)] : [])
      )
    });
    
    if (!task) {
      return res.status(404).json({
        success: false,
        error: `Task ${taskId} not found or you don't have permission to access it`
      });
    }
    
    // Get company ID from task or user session
    const companyId = task.company_id || (req.user?.company_id ?? null);
    
    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'Company ID could not be determined'
      });
    }
    
    // Prepare submission input
    const input: FormSubmissionInput = {
      taskId: parseInt(taskId.toString(), 10),
      companyId,
      formType,
      formData,
      userId: req.user?.id
    };
    
    logger.info(`[API] Form submission request received for ${formType}`, {
      taskId,
      companyId,
      formType,
      userId: req.user?.id
    });
    
    // Handle the form submission
    const result = await handleFormSubmission(input);
    
    logger.info(`[API] Form submission ${result.success ? 'succeeded' : 'failed'} for ${formType}`, {
      taskId,
      success: result.success,
      status: result.status,
      error: result.error
    });
    
    return res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    logger.error(`[API] Error handling form submission`, {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      formType,
      taskId
    });
    
    return res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
});

/**
 * Get form submissions for a specific form type
 * 
 * This endpoint returns information about submitted forms for a given type.
 * 
 * @route GET /api/forms/:formType/submissions
 */
router.get('/:formType/submissions', async (req: Request, res: Response) => {
  const { formType } = req.params;
  const { companyId } = req.query;
  
  try {
    // Validate form type
    try {
      mapClientFormTypeToSchemaType(formType);
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: `Invalid form type: ${formType}`
      });
    }
    
    // Build query conditions
    const conditions = [
      eq(tasks.status, 'submitted'),
      ...(companyId ? [eq(tasks.company_id, parseInt(companyId.toString(), 10))] : []),
      ...(req.user && !req.user.is_admin ? [eq(tasks.user_id, req.user.id)] : [])
    ];
    
    // Get submissions
    const submissions = await db.query.tasks.findMany({
      where: and(...conditions),
      orderBy: (tasks, { desc }) => [desc(tasks.updated_at)]
    });
    
    return res.status(200).json({
      success: true,
      submissions: submissions.map(submission => ({
        id: submission.id,
        title: submission.title,
        status: submission.status,
        progress: submission.progress,
        submittedAt: submission.metadata?.submissionDate || submission.updated_at,
        companyId: submission.company_id
      }))
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    logger.error(`[API] Error getting form submissions`, {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      formType
    });
    
    return res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
});

export default router;