/**
 * Unified Demo Auto-Fill API
 * 
 * This file provides standardized API endpoints for all demo auto-fill operations
 * across different form types (KYB, KY3P, Open Banking).
 * 
 * It uses a unified service to ensure consistent behavior and eliminates
 * the case sensitivity and status inconsistency issues that were present
 * in the previous implementation.
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { logger } from '../utils/logger';
import { unifiedDemoAutoFillService, getFormTypeFromTaskType, FormType } from '../services/unified-demo-autofill';
import { db } from '@db';
import { tasks } from '@db/schema';
import { eq } from 'drizzle-orm';

const router = Router();

/**
 * GET endpoint for retrieving demo data without applying it
 * This allows clients to preview the demo data before applying it
 */
router.get('/api/demo-autofill/:taskId', requireAuth, async (req, res) => {
  try {
    // Parse and validate parameters
    const taskId = parseInt(req.params.taskId, 10);
    if (isNaN(taskId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid task ID'
      });
    }
    
    // Get form type from query parameter or task type
    let formType = req.query.formType as FormType;
    
    if (!formType) {
      // Get task to determine form type
      const [task] = await db.select()
        .from(tasks)
        .where(eq(tasks.id, taskId));
        
      if (!task) {
        return res.status(404).json({
          success: false,
          error: 'Task not found'
        });
      }
      
      // SECURITY: Verify user belongs to the task's company
      if (req.user?.company_id !== task.company_id) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
          message: 'You do not have permission to access this task'
        });
      }
      
      // Determine form type from task type
      formType = getFormTypeFromTaskType(task.task_type) as FormType;
      
      if (!formType) {
        return res.status(400).json({
          success: false,
          error: 'Unknown form type',
          message: `Could not determine form type for task type: ${task.task_type}`
        });
      }
    }
    
    // Get demo data from unified service
    const result = await unifiedDemoAutoFillService.getDemoData(
      taskId,
      formType,
      req.user?.id
    );
    
    // Return the demo data
    res.json({
      success: true,
      message: 'Demo data generated successfully',
      formData: result.formData,
      progress: result.progress,
      status: result.status,
      taskId,
      formType
    });
  } catch (error) {
    logger.error('Error generating demo data', {
      taskId: req.params.taskId,
      formType: req.query.formType,
      userId: req.user?.id,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // Determine appropriate status code
    const statusCode = 
      error instanceof Error && error.message.includes('demo companies') ? 403 :
      error instanceof Error && error.message.includes('Task not found') ? 404 : 
      400;
    
    res.status(statusCode).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST endpoint for applying demo data
 * This applies the demo data to the form and updates progress
 */
router.post('/api/demo-autofill/:taskId', requireAuth, async (req, res) => {
  try {
    // Parse and validate parameters
    const taskId = parseInt(req.params.taskId, 10);
    if (isNaN(taskId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid task ID'
      });
    }
    
    // Get form type from request body, query parameter, or task type
    let formType = req.body.formType || req.query.formType as FormType;
    
    if (!formType) {
      // Get task to determine form type
      const [task] = await db.select()
        .from(tasks)
        .where(eq(tasks.id, taskId));
        
      if (!task) {
        return res.status(404).json({
          success: false,
          error: 'Task not found'
        });
      }
      
      // SECURITY: Verify user belongs to the task's company
      if (req.user?.company_id !== task.company_id) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
          message: 'You do not have permission to access this task'
        });
      }
      
      // Determine form type from task type
      formType = getFormTypeFromTaskType(task.task_type) as FormType;
      
      if (!formType) {
        return res.status(400).json({
          success: false,
          error: 'Unknown form type',
          message: `Could not determine form type for task type: ${task.task_type}`
        });
      }
    }
    
    // Apply demo data using unified service
    const result = await unifiedDemoAutoFillService.applyDemoData(
      taskId,
      formType,
      req.user?.id
    );
    
    // Return result
    res.json({
      success: true,
      message: 'Demo data applied successfully',
      fieldCount: result.fieldCount,
      progress: result.progress,
      status: result.status,
      taskId,
      formType
    });
  } catch (error) {
    logger.error('Error applying demo data', {
      taskId: req.params.taskId,
      formType: req.body.formType || req.query.formType,
      userId: req.user?.id,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // Determine appropriate status code
    const statusCode = 
      error instanceof Error && error.message.includes('demo companies') ? 403 :
      error instanceof Error && error.message.includes('Task not found') ? 404 : 
      400;
    
    res.status(statusCode).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Backward compatibility endpoints

/**
 * KYB demo auto-fill endpoint (redirects to unified endpoint)
 */
router.post('/api/kyb/demo-autofill/:taskId', requireAuth, async (req, res) => {
  try {
    // Set form type in body
    req.body.formType = 'kyb';
    const taskId = parseInt(req.params.taskId, 10);
    
    // Call service directly instead of forwarding
    const result = await unifiedDemoAutoFillService.applyDemoData(
      taskId,
      'kyb',
      req.user?.id
    );
    
    logger.info('Successfully applied KYB demo data', {
      taskId,
      formType: 'kyb',
      fieldCount: result.fieldCount
    });
    
    res.json({
      success: true,
      message: 'Demo data applied successfully',
      fieldCount: result.fieldCount, 
      progress: result.progress,
      status: result.status,
      taskId,
      formType: 'kyb'
    });
  } catch (error) {
    logger.error('Error applying KYB demo data', {
      taskId: req.params.taskId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // Determine appropriate status code
    const statusCode = 
      error instanceof Error && error.message.includes('demo companies') ? 403 :
      error instanceof Error && error.message.includes('Task not found') ? 404 : 
      400;
    
    res.status(statusCode).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * KY3P demo auto-fill endpoint (redirects to unified endpoint)
 */
router.post('/api/ky3p/demo-autofill/:taskId', requireAuth, async (req, res) => {
  try {
    // Set form type in body
    req.body.formType = 'ky3p';
    const taskId = parseInt(req.params.taskId, 10);
    
    // Call service directly instead of forwarding
    const result = await unifiedDemoAutoFillService.applyDemoData(
      taskId,
      'ky3p',
      req.user?.id
    );
    
    logger.info('Successfully applied KY3P demo data', {
      taskId,
      formType: 'ky3p',
      fieldCount: result.fieldCount
    });
    
    res.json({
      success: true,
      message: 'Demo data applied successfully',
      fieldCount: result.fieldCount, 
      progress: result.progress,
      status: result.status,
      taskId,
      formType: 'ky3p'
    });
  } catch (error) {
    logger.error('Error applying KY3P demo data', {
      taskId: req.params.taskId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // Determine appropriate status code
    const statusCode = 
      error instanceof Error && error.message.includes('demo companies') ? 403 :
      error instanceof Error && error.message.includes('Task not found') ? 404 : 
      400;
    
    res.status(statusCode).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Open Banking demo auto-fill endpoint (redirects to unified endpoint)
 */
router.post('/api/open-banking/demo-autofill/:taskId', requireAuth, async (req, res) => {
  try {
    // Set form type in body
    req.body.formType = 'open_banking';
    const taskId = parseInt(req.params.taskId, 10);
    
    // Call service directly instead of forwarding
    const result = await unifiedDemoAutoFillService.applyDemoData(
      taskId,
      'open_banking',
      req.user?.id
    );
    
    logger.info('Successfully applied Open Banking demo data', {
      taskId,
      formType: 'open_banking',
      fieldCount: result.fieldCount
    });
    
    res.json({
      success: true,
      message: 'Demo data applied successfully',
      fieldCount: result.fieldCount, 
      progress: result.progress,
      status: result.status,
      taskId,
      formType: 'open_banking'
    });
  } catch (error) {
    logger.error('Error applying Open Banking demo data', {
      taskId: req.params.taskId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // Determine appropriate status code
    const statusCode = 
      error instanceof Error && error.message.includes('demo companies') ? 403 :
      error instanceof Error && error.message.includes('Task not found') ? 404 : 
      400;
    
    res.status(statusCode).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
